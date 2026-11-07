'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TextAreaField } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useBlockingLoader } from '@/components/loading-overlay'
import type { AppointmentStatus } from '@/lib/types'

/**
 * Approve and decline, per booking.
 *
 * Approving is one click: it moves a pending booking to confirmed and nothing
 * leaves the building, so there is nothing to undo badly.
 *
 * Declining opens a dialog. It cancels the appointment, frees the slot, stops
 * the pending reminders and emails the patient, and none of that can be taken
 * back from here, so it asks first and takes an optional note.
 */
export function AppointmentActions({
  bookingRef,
  patientName,
  status,
  when,
}: {
  bookingRef: string
  patientName: string
  status: AppointmentStatus
  /** Human readable date and time, shown in the decline confirmation. */
  when: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const loader = useBlockingLoader()

  const [busy, setBusy] = React.useState<'approve' | 'decline' | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')

  const canApprove = status === 'pending'
  const canDecline = status === 'pending' || status === 'confirmed'

  // A booking that is already cancelled, completed or missed has nothing to
  // act on, and a disabled pair of buttons on every historical row is noise.
  if (!canApprove && !canDecline) return null

  const send = async (action: 'approve' | 'decline', note?: string) => {
    if (busy) return
    setBusy(action)

    // The dialog closes before the loader appears, never after. A Radix modal
    // locks document scrolling while it is open, and leaving it open behind
    // the full screen loader meant the page could not be scrolled for as long
    // as the request took. Errors are reported by toast, so nothing is lost by
    // closing first.
    setDialogOpen(false)

    const done = loader.start(action === 'approve' ? 'Approving' : 'Declining')

    try {
      const response = await fetch('/api/admin/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, action, reason: note || undefined }),
      })
      const json = await response.json()

      if (!response.ok || !json.ok) {
        toast({
          tone: 'error',
          title: action === 'approve' ? 'Could not approve' : 'Could not decline',
          description: json?.error?.message ?? 'Please try again.',
        })
        return
      }

      setReason('')
      toast({
        tone: 'success',
        title: action === 'approve' ? 'Booking approved' : 'Booking declined',
        description:
          action === 'approve'
            ? `${bookingRef} is now confirmed.`
            : `${bookingRef} is cancelled and the patient has been emailed.`,
      })

      // The list is server rendered, so refresh rather than patching state:
      // the counts above it have to move too.
      router.refresh()
    } catch {
      toast({
        tone: 'error',
        title: 'No connection',
        description: 'We could not reach the server. Check your connection and try again.',
      })
    } finally {
      setBusy(null)
      done()
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canApprove && (
          <Button
            size="sm"
            onClick={() => send('approve')}
            loading={busy === 'approve'}
            loadingLabel="Approving"
            disabled={busy !== null}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Approve
          </Button>
        )}

        {canDecline && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDialogOpen(true)}
            disabled={busy !== null}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Decline
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !busy && setDialogOpen(open)}>
        <DialogContent
          title="Decline this booking?"
          description={`${patientName}, ${when}. Reference ${bookingRef}.`}
        >
          <p className="text-fluid-sm leading-relaxed text-ink-soft">
            The appointment is cancelled, the slot goes back on offer, any reminder that has not
            gone out is stopped, and the patient is emailed. This cannot be undone from here.
          </p>

          <div className="mt-5">
            <TextAreaField
              id={`decline-reason-${bookingRef}`}
              label="Reason, optional"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              counterMax={400}
              currentLength={reason.length}
              hint="Kept on the record for staff. It is not shown in the patient's email."
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 xs:flex-row xs:justify-end">
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(false)}
              disabled={busy !== null}
            >
              Keep the booking
            </Button>
            <Button
              variant="danger"
              onClick={() => send('decline', reason.trim())}
              loading={busy === 'decline'}
              loadingLabel="Declining"
              disabled={busy !== null}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Decline and notify
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

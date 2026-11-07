import { MessageSquareWarning } from 'lucide-react'

import { Badge, Card, EmptyState } from '@/components/ui/primitives'
import type { ContactMessageRecord } from '@/lib/types'

/**
 * Contact form enquiries.
 *
 * Shared by the dashboard, which shows the newest few, and the Messages page,
 * which shows the lot.
 */
export function MessageList({
  messages,
  timezone,
}: {
  messages: ContactMessageRecord[]
  timezone: string
}) {
  if (messages.length === 0) {
    return (
      <EmptyState
        className="mt-5"
        icon={<MessageSquareWarning className="h-8 w-8" aria-hidden="true" />}
        title="No messages"
        body="Anything sent through the contact form or the FAQ page appears here."
      />
    )
  }

  return (
    <ul className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
      {messages.map((m) => (
        <li key={m.id}>
          <Card className="flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink">{m.name}</p>
                <p className="truncate text-fluid-xs text-ink-muted">{m.email}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Badge tone="neutral">{m.topic}</Badge>
                <Badge
                  tone={m.status === 'new' ? 'primary' : m.status === 'replied' ? 'ok' : 'warn'}
                >
                  {m.status === 'in_review' ? 'in review' : m.status}
                </Badge>
              </div>
            </div>

            <p className="mt-3 flex-1 text-fluid-sm leading-relaxed text-ink-soft">{m.message}</p>

            {m.aiDraftReply && (
              <div className="mt-4 rounded-xl border border-primary/25 bg-primary-soft p-3">
                <p className="text-fluid-xs font-medium uppercase tracking-wide text-primary-strong">
                  Suggested reply, for review
                </p>
                <p className="mt-1.5 text-fluid-sm leading-relaxed text-ink-soft">
                  {m.aiDraftReply}
                </p>
              </div>
            )}

            <p className="mt-4 text-fluid-xs text-ink-muted">
              {new Date(m.createdAt).toLocaleString('en-PH', { timeZone: timezone })}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  )
}

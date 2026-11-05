'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useBlockingLoader } from '@/components/loading-overlay'

/** Clears the session cookie and returns to the login page. */
export function SignOutButton() {
  const router = useRouter()
  const loader = useBlockingLoader()
  const [working, setWorking] = React.useState(false)

  const signOut = async () => {
    if (working) return
    setWorking(true)
    const done = loader.start('Signing out')

    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.replace('/admin/login')
      router.refresh()
    } catch {
      // Even if the request failed, sending them to the login page is the
      // right move: the middleware will re check the cookie on arrival.
      router.replace('/admin/login')
    } finally {
      setWorking(false)
      done()
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={signOut} loading={working} loadingLabel="Signing out">
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sign out
    </Button>
  )
}

import type { Metadata } from 'next'
import { Inbox } from 'lucide-react'

import { getOrganization, listContactMessages } from '@/lib/repo'
import { Badge } from '@/components/ui/primitives'
import { MessageList } from '@/components/admin/message-list'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Contact form inbox.
 *
 * Newest first, with any Zapier drafted reply shown under the message it
 * answers. The draft is labelled for review rather than presented as a reply,
 * because nothing here sends anything.
 */
export default async function AdminMessagesPage() {
  const [org, messages] = await Promise.all([getOrganization(), listContactMessages(100)])

  const unread = messages.filter((m) => m.status === 'new').length

  return (
    <AdminPage>
      <AdminPageHeader
        title="Messages"
        subtitle="Everything sent through the contact form, newest first."
        actions={
          <Badge tone={unread > 0 ? 'primary' : 'neutral'}>
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            {unread} unread of {messages.length}
          </Badge>
        }
      />

      <section className="mt-2" aria-label="Contact messages">
        <MessageList messages={messages} timezone={org.timezone} />
      </section>
    </AdminPage>
  )
}

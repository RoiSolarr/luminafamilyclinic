import { Card } from '@/components/ui/primitives'

/**
 * Shared furniture for the staff pages.
 *
 * Every section gets the same title block and the same padding, so moving
 * between them does not shift the layout under the reader.
 */
export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="container py-8 lg:py-12">{children}</div>
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-fluid-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-fluid-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <Card className={tone === 'danger' ? 'border-danger/35' : undefined}>
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary-strong'
        }`}
      >
        {icon}
      </span>
      <p className="mt-3 font-display text-fluid-3xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-fluid-sm text-ink">{label}</p>
      <p className="text-fluid-xs text-ink-muted">{hint}</p>
    </Card>
  )
}

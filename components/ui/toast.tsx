'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/components/motion'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const toneStyles: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden="true" />,
    ring: 'border-ok/30',
  },
  error: {
    icon: <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />,
    ring: 'border-danger/35',
  },
  info: {
    icon: <Info className="h-5 w-5 text-primary" aria-hidden="true" />,
    ring: 'border-primary/30',
  },
}

/** Toast host. Wraps the app once, in the root layout. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(1)
  const reduced = useReducedMotion()

  const toast = React.useCallback(
    ({ title, description, tone = 'info' }: { title: string; description?: string; tone?: ToastTone }) => {
      const id = nextId.current++
      setItems((current) => [...current.slice(-2), { id, title, description, tone }])
    },
    [],
  )

  const dismiss = React.useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id))
  }, [])

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={6000}>
        {children}

        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastPrimitive.Root
              key={item.id}
              open
              onOpenChange={(open) => {
                if (!open) dismiss(item.id)
              }}
              asChild
              forceMount
            >
              <motion.li
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 shadow-lift',
                  toneStyles[item.tone].ring,
                )}
              >
                <span className="mt-0.5">{toneStyles[item.tone].icon}</span>
                <div className="min-w-0 flex-1">
                  <ToastPrimitive.Title className="font-medium text-ink">
                    {item.title}
                  </ToastPrimitive.Title>
                  {item.description && (
                    <ToastPrimitive.Description className="mt-1 text-fluid-sm text-ink-soft">
                      {item.description}
                    </ToastPrimitive.Description>
                  )}
                </div>
                <ToastPrimitive.Close
                  aria-label="Dismiss"
                  className="tap-target -mr-2 -mt-2 inline-flex items-center justify-center rounded-full text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </ToastPrimitive.Close>
              </motion.li>
            </ToastPrimitive.Root>
          ))}
        </AnimatePresence>

        <ToastPrimitive.Viewport
          className={cn(
            'pointer-events-none fixed bottom-0 right-0 z-[60] flex w-full max-w-[26rem] flex-col gap-2 p-4',
            // Clear of the sticky mobile booking bar.
            'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-4',
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

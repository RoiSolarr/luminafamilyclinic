'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'lumina-theme'

/**
 * Three way theme control: system, light, dark.
 *
 * The matching inline script in the root layout applies the stored choice
 * before first paint, so there is no flash of the wrong theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>('system')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      // Private mode or blocked storage. System preference it is.
    }
  }, [])

  const apply = React.useCallback((next: Theme) => {
    setTheme(next)
    const root = document.documentElement
    if (next === 'system') {
      root.removeAttribute('data-theme')
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    } else {
      root.setAttribute('data-theme', next)
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" aria-hidden="true" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" aria-hidden="true" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" aria-hidden="true" /> },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = mounted && theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${option.label} theme`}
            onClick={() => apply(option.value)}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'bg-primary text-primary-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}

/** Runs before hydration so the stored theme is applied on the first paint. */
export const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
})();
`

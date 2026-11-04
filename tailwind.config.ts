import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // Explicit breakpoint scale, including the extra `xs` tier for small phones.
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        xs: '1.25rem',
        md: '2rem',
        xl: '2.5rem',
      },
      screens: {
        // Caps the reading width on ultrawide and 4K displays.
        '2xl': '1360px',
        '3xl': '1440px',
      },
    },
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          soft: 'rgb(var(--c-primary-soft) / <alpha-value>)',
          strong: 'rgb(var(--c-primary-strong) / <alpha-value>)',
          ink: 'rgb(var(--c-primary-ink) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          soft: 'rgb(var(--c-accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-accent-ink) / <alpha-value>)',
        },
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      fontSize: {
        // Fluid type scale. Body stays at 16px minimum so iOS never zooms forms.
        'fluid-xs': 'clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)',
        'fluid-sm': 'clamp(0.875rem, 0.85rem + 0.18vw, 0.9375rem)',
        'fluid-base': 'clamp(1rem, 0.97rem + 0.2vw, 1.0625rem)',
        'fluid-lg': 'clamp(1.125rem, 1.07rem + 0.3vw, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 1.5rem + 1.8vw, 2.75rem)',
        'fluid-4xl': 'clamp(2.25rem, 1.6rem + 3vw, 4rem)',
      },
      spacing: {
        // 8px grid extensions.
        18: '4.5rem',
        22: '5.5rem',
        section: 'clamp(3.5rem, 2rem + 6vw, 7rem)',
        gutter: 'clamp(1rem, 0.5rem + 2vw, 2.5rem)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 42 56 / 0.04), 0 8px 24px -12px rgb(15 42 56 / 0.12)',
        lift: '0 2px 4px rgb(15 42 56 / 0.05), 0 18px 40px -16px rgb(15 42 56 / 0.22)',
        ring: '0 0 0 1px rgb(var(--c-line) / 1)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'accordion-up': 'accordion-up 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries')],
}

export default config

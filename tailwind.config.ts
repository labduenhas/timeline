import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terracotta: 'rgb(var(--terracotta) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
        'primary-container': 'rgb(var(--primary-container) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'on-surface': 'rgb(var(--on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--on-surface-variant) / <alpha-value>)',
        outline: 'rgb(var(--outline) / <alpha-value>)',
        'outline-variant': 'rgb(var(--outline-variant) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--surface-container-lowest) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--surface-container-low) / <alpha-value>)',
        'surface-container': 'rgb(var(--surface-container) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--surface-container-highest) / <alpha-value>)',
        'surface-variant': 'rgb(var(--surface-variant) / <alpha-value>)',
        'secondary-fixed': 'rgb(var(--secondary-fixed) / <alpha-value>)',
        'on-secondary-fixed': 'rgb(var(--on-secondary-fixed) / <alpha-value>)',
        scrim: 'rgb(var(--scrim) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      spacing: {
        'margin-desktop': '4.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
      },
      fontSize: {
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['15px', { lineHeight: '24px' }],
        'body-sm': ['13px', { lineHeight: '20px' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.06em' }],
        'headline-sm': ['22px', { lineHeight: '30px' }],
        'headline-md': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em' }],
        'headline-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.015em' }],
        'display-xl': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
} satisfies Config

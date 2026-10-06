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
        terracotta: '#8C4325',
        primary: '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#1c1b1b',
        surface: '#f9f9f7',
        'on-surface': '#1a1c1b',
        'on-surface-variant': '#444748',
        outline: '#747878',
        'outline-variant': '#c4c7c7',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f4f4f2',
        'surface-container': '#eeeeec',
        'surface-container-high': '#e8e8e6',
        'surface-container-highest': '#e2e3e1',
        'surface-variant': '#e2e3e1',
        'secondary-fixed': '#e0e0ff',
        'on-secondary-fixed': '#00016d',
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

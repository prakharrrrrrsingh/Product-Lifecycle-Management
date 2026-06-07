/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eef0ff',
          100: '#e0e3ff',
          200: '#c7cbfe',
          300: '#a5a9fc',
          400: '#8183f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4038ca',
          800: '#3530a4',
          900: '#2e2d82',
          950: '#1c1b4e',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulseSlow 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSlow: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.4', transform: 'scale(0.75)' } },
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'brand':      '0 4px 14px 0 rgb(99 102 241 / 0.35)',
      },
    },
  },
  plugins: [],
}

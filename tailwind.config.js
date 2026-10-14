/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0A0D14',
        surface: '#141A29',
        'surface-elevated': '#1B2337',
        'border-subtle': '#242E45',
        primary: {
          DEFAULT: '#FFAE75',
          hover: '#FF9E5C',
          light: '#FFD3B5',
        },
        textPrimary: '#F1F5F9',
        textMuted: '#9E9E9E',
        danger: {
          DEFAULT: '#F87171',
          bg: 'rgba(248, 113, 113, 0.15)',
        },
        success: {
          DEFAULT: '#34D399',
          bg: 'rgba(52, 211, 153, 0.15)',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(255, 174, 117, 0.25)',
        'glow-success': '0 0 20px rgba(52, 211, 153, 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

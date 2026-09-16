/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1220',
        panel: '#111a2e',
        panel2: '#16233f',
        line: '#22304d',
        brand: '#1f6feb',
        brand2: '#4f9dff',
        navy: '#14213d',
        good: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
        muted: '#8aa0c6',
      },
      fontFamily: {
        sans: ['"Assistant"', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,.03), 0 12px 30px -12px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
}

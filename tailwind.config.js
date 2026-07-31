/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#eef1f5',
          muted: '#e4e8ee',
        },
        ink: {
          DEFAULT: '#0f0f0f',
          50: '#f7f7f7',
          100: '#ebebeb',
          200: '#d4d4d4',
          300: '#949494',
          400: '#6b7280',
          500: '#525252',
          600: '#3d3d3d',
          700: '#2b2b2b',
          800: '#1c1c1c',
          900: '#0f0f0f',
        },
        brand: {
          DEFAULT: '#2563eb',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
      },
    },
  },
  plugins: [],
}

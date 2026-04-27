/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        p: {
          bg: '#f5f5f0',
          sidebar: '#ffffff',
          panel: '#ffffff',
          surface: '#ebebe6',
          lime: '#AEC911',
          'lime-light': '#c5dd3a',
          'lime-bg': 'rgba(174, 201, 17, 0.08)',
          'lime-border': 'rgba(174, 201, 17, 0.25)',
          blue: '#60CAFF',
          red: '#FF5757',
          yellow: '#F4CD29',
          dark: '#2d2d2d',
          gray: '#6b7280',
          'gray-light': '#9ca3af',
          muted: '#b0b3bc',
          border: '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
}

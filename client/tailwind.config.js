/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        urgent: '#EF4444',
        waiting: '#F59E0B',
        completed: '#10B981',
        optional: '#3B82F6',
        draft: '#6B7280',
        primary: '#F97316'
      },
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

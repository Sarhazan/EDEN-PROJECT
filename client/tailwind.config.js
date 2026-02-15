/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: '#4F46E5', // Indigo 600
        secondary: '#8B5CF6', // Violet 500

        // Semantic status colors (refined)
        urgent: '#E11D48', // Rose 600
        waiting: '#D97706', // Amber 600
        completed: '#059669', // Emerald 600
        optional: '#0284C7', // Sky 600
        draft: '#64748B', // Slate 500

        // Expanded neutrals with warm undertones
        'surface-white': '#FAFAFA',
        'background': '#F5F5F7',
        'divider': '#E8E8EA',
      },
      fontFamily: {
        alef: ['Alef', 'sans-serif'],
        sans: ['Heebo', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.07), 0 8px 10px -6px rgb(0 0 0 / 0.07)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.08)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'medium': '300ms',
        'slow': '500ms',
      },
      transitionTimingFunction: {
        'bounce-subtle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        sk: {
          sidebar: '#3d2b24',
          'sidebar-active': '#5a4339',
          'sidebar-border': '#6b5248',
          canvas: '#f2ece1',
          card: '#faf6ef',
          'card-border': '#8b7355',
          ink: '#2c1f1a',
          'ink-muted': '#52463f',
          accent: '#c17a3a',
          run: '#3e6640',
          'run-hover': '#345735',
          'stat-savings': '#8fa88f',
          'stat-solar': '#e8c98a',
          'stat-battery': '#9aabb8',
          'stat-grid': '#a89888',
          progress: '#5a8f5c',
          placeholder: '#e8dfd0',
        },
      },
    },
  },
  plugins: [],
}
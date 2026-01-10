/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safegate-green': '#22c55e', // Zgodnie z dok. pkt 10.3 (Stan Sukcesu)
        'safegate-red': '#ef4444',   // Zgodnie z dok. pkt 10.4 (Stan Odmowy)
      }
    },
  },
  plugins: [],
}
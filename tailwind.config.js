/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-container": "#2d2b7a",
        "secondary-container": "#2410e2",
        "primary": "#c2c1ff",
        "outline": "#918f9c",
        "surface-variant": "#333535",
      },
      fontFamily: {
        "inter": ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'main-blue': '#0064FF',
        'main-gray': '#C4C4C4',
        'main-dark': '#000000',
        'main-light': '#FFFFFF',
        'main-red': '#FF3232',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

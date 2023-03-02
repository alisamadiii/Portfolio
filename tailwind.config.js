/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        black: "#121212",
      },
      boxShadow: {
        button: "0 4px 0px rgba(0, 0, 0, .3)",
        theme: "0 0 0px 3px gray",
      },
      borderColor: {
        "social-media": "#C5C5C5",
      },
    },
  },
  plugins: [],
};

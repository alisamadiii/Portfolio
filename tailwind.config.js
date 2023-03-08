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
        black: "#212121",
        primary: "#E1E1E1",
        secondary: "#3A6351",
      },
      boxShadow: {
        button: "0 4px 0px rgba(0, 0, 0, .3)",
        theme: "0 0 0px 3px gray",
      },
      borderColor: {
        "social-media": "#C5C5C5",
      },
      animation: {
        "wavy-circle": "wavy-circle 1s infinite",
      },
      keyframes: {
        "wavy-circle": {
          "0%": { transform: "translateZ(-120px)" },
          "100%": { transform: "translateZ(100px)" },
        },
      },
      aspectRatio: {
        banner: "16/8",
      },
    },
  },
  plugins: [],
};

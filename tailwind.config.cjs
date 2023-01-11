/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    colors: {
      primary: "#00B7C2",
      secondary: "#052032",
      dark: "#000000",
      light: "#FFFFFF",
      "light-20": "#FFFFFF20",
      link: "#AAAAAA",
      linkedIn: "#0077b5",
      transparent: "transparent",
    },
    extend: {
      animation: {
        "bounce-slower": "bounce 4s linear infinite",
        "bounce-slow": "bounce 2s linear infinite",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      primary: "#1D9BF0",
      secondary: "#0F1419",
      "primary-hover": "#1A8CD8",
      "font-2": "#536471",
      "button-hover": "#E7E7E8",
      white: "#fff",
      black: "#000",
      test: "#ff0000",
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 15,
      xl: 20,
    },
  },
  plugins: [],
};

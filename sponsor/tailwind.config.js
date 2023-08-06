/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      primary: "#1D9BF0",
      secondary: "#0F1419",
      likes: "rgba(249, 24, 128)",
      retweets: "rgb(0, 186, 124)",
      impressions: "",
      "primary-hover": "#1A8CD8",
      "font-2": "#536471",
      "button-hover": "#E7E7E8",
      "tweet-hover": "#f7f7f7",
      white: "#fff",
      black: "#000",
      test: "#ff0000",
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 15,
      xl: 20,
      "2xl": 24,
      "3xl": 28,
    },
    extend: {
      animation: {
        squish: "squish .5s infinite alternate",
      },
      keyframes: {
        squish: {
          from: { transform: "scale(1) translateY(0%)" },
          to: { transform: "scale(.9) translateY(-25%)" },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6747EB",
        secondary: "#FF9C45",
        "dark-blue": "#2C2F5A",
        "dark-blue-2": "#696C9A",
        "light-blue": "#F1F5FF",
        "light-blue-2": "#E7EDFB",
        twitter: "#00acee",
      },
      boxShadow: {
        container: "0 10px 65px rgba(0, 0, 0, .09)",
      },
    },
  },
  plugins: [],
};

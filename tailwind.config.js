/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
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
        info: "#2F80ED",
        success: "#27AE60",
        warning: "#E2B93B",
        error: "#EB5757",
      },
      boxShadow: {
        button: "0 4px 15px rgba(0, 0, 0, .25)",
        container: "0 10px 65px rgba(0, 0, 0, .09)",
      },
      backgroundImage: {
        pattern: `linear-gradient(#E7EDFB 2px, transparent 2px), linear-gradient(90deg, #E7EDFB 1px, transparent 1px);`,
      },
      backgroundSize: {
        pattern: "40px 40px, 40px 40px, 20px 20px, 20px 20px",
      },
      backgroundPosition: {
        pattern: "-2px -2px, -2px -2px, -1px -1px, -1px -1px",
      },
    },
  },
  plugins: [],
};

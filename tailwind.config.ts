import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111010",
        foreground: "#FFFFFF",
        muted: {
          DEFAULT: "#737373",
          2: "#A3A3A3",
          3: "#d4d4d4",
        },
        box: "#262626",
        border: "#404040",
      },
      boxShadow: {
        "box-focus": "0 0 0 2px #111010, 0 0 0 4px white",
      },
      animation: {
        "badge-circle-expand": "badge-circle-expand 1s infinite linear",
      },
      keyframes: {
        "badge-circle-expand": {
          from: {
            transform: "scale(1)",
            opacity: "1",
          },
          to: {
            transform: "scale(2)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;

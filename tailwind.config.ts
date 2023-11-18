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
        },
        box: "#262626",
        border: "#404040",
      },
      boxShadow: {
        "box-focus": "0 0 0 2px #111010, 0 0 0 4px white",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        "primary-hover": "hsl(var(--primary-hover) / <alpha-value>)",
        muted: "hsl(var(--muted)/ <alpha-value>)",
        code: "hsl(var(--code-bg)/ <alpha-value>)",
        "code-figcaption": "hsl(var(--code-figcaption-bg)/ <alpha-value>)",
        "code-gradient-from": "hsla(var(--code-gradient-from) / 0)",
        "code-gradient-to": "hsl(var(--code-gradient-to))",
      },
      borderColor: {
        wrapper: "hsl(var(--border) / <alpha-value>)",
        "wrapper-2": "hsl(var(--border-2) / <alpha-value>)",
        code: "hsl(var(--code-border) / <alpha-value>)",
      },
      borderWidth: {
        wrapper: "1px",
        "wrapper-2": "1px",
        code: "1px",
      },
      animation: {
        blur: "blur 1s forwards",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      keyframes: {
        blur: {
          to: {
            opacity: "1",
            filter: "blur(0px)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;

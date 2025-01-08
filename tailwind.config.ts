import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./preview/**/*.{js,ts,jsx,tsx,mdx}",
    "./contents/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        natural: {
          "100": "hsl(var(--natural-100))",
          "150": "hsl(var(--natural-150))",
          "200": "hsl(var(--natural-200))",
          "300": "hsl(var(--natural-300))",
          "400": "hsl(var(--natural-400))",
          "500": "hsl(var(--natural-500))",
          "600": "hsl(var(--natural-600))",
          "700": "hsl(var(--natural-700))",
          "800": "hsl(var(--natural-800))",
          "900": "hsl(var(--natural-900))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        lora: "var(--font-lora)",
        inter: "var(--font-inter)",
      },
      boxShadow: {
        "custom-card":
          "0px 0px 4.7px 0px rgba(0, 0, 0, 0.05), 0px 1px 1.9px 0px rgba(0, 0, 0, 0.11)",
      },
      animation: {
        "element-in": "element-in .4s ease-in-out forwards",
        spotlight: "spotlight .7s .1s ease-in-out forwards",
        progress: "progress 4s linear forwards",
      },
      keyframes: {
        "element-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
            filter: "blur(4px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0px)",
          },
        },
        spotlight: {
          "0%": {
            // transform: "translate(-10px, -10px)",
            opacity: "0",
          },
          "100%": {
            // transform: "translate(96px, 20px)",
            opacity: "1",
          },
        },
        progress: {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(0)",
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

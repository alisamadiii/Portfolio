import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const SERVER = "http://localhost:3028";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  // Client sites are served from the same origin and often ship their own
  // /assets folder, so the app's bundle lives under /_app instead.
  build: { assetsDir: "_app" },
  server: {
    port: 3027,
    proxy: { "/api": SERVER, "/sites": SERVER },
  },
});

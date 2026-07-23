import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const resolvePkg = (p: string) =>
  fileURLToPath(new URL(`../../packages/${p}/src`, import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000";

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    // The shared @workspace/* packages have no exports map; resolve their
    // subpaths to source so this Vite app consumes the same code as the
    // Next.js apps. dedupe keeps a single React / React Query instance so the
    // tRPC + Query context is shared.
    resolve: {
      alias: {
        "@workspace/trpc": resolvePkg("trpc"),
        "@workspace/auth": resolvePkg("auth"),
        "@workspace/drizzle": resolvePkg("drizzle"),
        "@workspace/email": resolvePkg("email"),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    // The shared client reads process.env.NEXT_PUBLIC_API_URL; map our
    // VITE_API_URL onto it so the tRPC client points at the API.
    define: {
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(apiUrl),
    },
  };
});

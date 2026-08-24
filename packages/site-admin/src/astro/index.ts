/**
 * Astro glue. The consumer adds two files:
 *
 *   src/pages/api/admin/[...path].ts
 *     import { createAstroAdminHandler } from "@alisamadiillc/site-admin/astro";
 *     export const prerender = false;
 *     export const ALL = createAstroAdminHandler();
 *
 *   src/pages/admin/[...path].astro
 *     ---
 *     import Admin from "@alisamadiillc/site-admin/astro/Admin.astro";
 *     export const prerender = false;
 *     ---
 *     <Admin />
 *
 * Env (server): CLERK_SECRET_KEY, ADMIN_GITHUB_REPO, optional ADMIN_GITHUB_BRANCH.
 * Env (client + server): PUBLIC_CLERK_PUBLISHABLE_KEY.
 */

import { createAdminHandler } from "../core/handler";
import type { AdminConfig } from "../core/types";

type EnvName =
  | "CLERK_SECRET_KEY"
  | "PUBLIC_CLERK_PUBLISHABLE_KEY"
  | "ADMIN_GITHUB_REPO"
  | "ADMIN_GITHUB_BRANCH";

/**
 * import.meta.env first (Astro/Vite), process.env fallback (node runtimes).
 * Accesses MUST be static property reads — Vite's module runner rejects
 * dynamic `import.meta.env[name]` indexing.
 */
const readImportMetaEnv = (name: EnvName): unknown => {
  try {
    switch (name) {
      case "CLERK_SECRET_KEY":
        return (import.meta as any).env?.CLERK_SECRET_KEY;
      case "PUBLIC_CLERK_PUBLISHABLE_KEY":
        return (import.meta as any).env?.PUBLIC_CLERK_PUBLISHABLE_KEY;
      case "ADMIN_GITHUB_REPO":
        return (import.meta as any).env?.ADMIN_GITHUB_REPO;
      case "ADMIN_GITHUB_BRANCH":
        return (import.meta as any).env?.ADMIN_GITHUB_BRANCH;
    }
  } catch {
    return undefined;
  }
};

export const readEnv = (name: EnvName): string | undefined => {
  const fromImportMeta = readImportMetaEnv(name);
  if (typeof fromImportMeta === "string" && fromImportMeta) {
    return fromImportMeta;
  }
  if (typeof process !== "undefined") {
    const fromProcess = process.env?.[name];
    if (typeof fromProcess === "string" && fromProcess) return fromProcess;
  }
  return undefined;
};

const requireEnv = (name: EnvName): string => {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `@alisamadiillc/site-admin: missing required env var ${name}.`
    );
  }
  return value;
};

export const resolveAdminConfig = (
  overrides: Partial<AdminConfig> = {}
): AdminConfig => ({
  clerkSecretKey: overrides.clerkSecretKey ?? requireEnv("CLERK_SECRET_KEY"),
  clerkPublishableKey:
    overrides.clerkPublishableKey ??
    requireEnv("PUBLIC_CLERK_PUBLISHABLE_KEY"),
  repo: overrides.repo ?? requireEnv("ADMIN_GITHUB_REPO"),
  branch: overrides.branch ?? readEnv("ADMIN_GITHUB_BRANCH"),
  basePath: overrides.basePath ?? "/api/admin",
});

type AstroAPIContext = { request: Request };

/** Catch-all Astro API route handler. Export it as `ALL`. */
export const createAstroAdminHandler = (
  overrides: Partial<AdminConfig> = {}
) => {
  // Resolve config lazily so a missing env var surfaces as a 500 with a clear
  // message on first request instead of crashing the whole server at import.
  let handler: ((request: Request) => Promise<Response>) | null = null;

  return async (context: AstroAPIContext): Promise<Response> => {
    try {
      handler ??= createAdminHandler(resolveAdminConfig(overrides));
    } catch (error) {
      return Response.json(
        { status: "error", message: (error as Error).message },
        { status: 500 }
      );
    }
    return handler(context.request);
  };
};

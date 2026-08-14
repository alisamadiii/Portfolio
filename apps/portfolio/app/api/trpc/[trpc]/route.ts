import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@workspace/trpc/init";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { appRouter } from "@workspace/trpc/routers/_app";

// Some procedures (fresh Stripe feature checks, bulk sends) can exceed the
// default function timeout.
export const maxDuration = 60;

// Get allowed origins from environment variables and defaults
function getAllowedOrigins(): string[] {
  const origins: string[] = ALLOWED_ORIGINS;

  // Vercel preview URLs (if using Vercel)
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Remove duplicates and return
  return [...new Set(origins)];
}

// Check if origin is allowed and get the allowed origin value
function getAllowedOriginHeader(
  origin: string | null,
  allowedOrigins: string[]
): string {
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  // Return first allowed origin as fallback (never null)
  return allowedOrigins[0] || "http://localhost:3000";
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    // Lets clients send queries as POST (httpBatchLink methodOverride) so
    // batched query URLs can't blow past URL length limits.
    allowMethodOverride: true,
    responseMeta() {
      const origin = req.headers.get("origin");
      const allowedOrigins = getAllowedOrigins();
      const allowedOrigin = getAllowedOriginHeader(origin, allowedOrigins);

      // Cannot use "*" when credentials are included - must specify the exact origin
      return {
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
        },
      };
    },
  });

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = getAllowedOriginHeader(origin, allowedOrigins);

  // Cannot use "*" when credentials are included - must specify the exact origin
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export { handler as GET, handler as POST };

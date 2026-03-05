import { toNextJsHandler } from "better-auth/next-js";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { auth } from "@workspace/auth/auth";

const corsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  };
};

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req),
  });
}

const handler = toNextJsHandler(auth);

async function withCors(
  req: Request,
  handlerFn: (req: Request) => Promise<Response>
): Promise<Response> {
  const response = await handlerFn(req);
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(req)).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(req: Request) {
  return withCors(req, handler.GET);
}

export async function POST(req: Request) {
  return withCors(req, handler.POST);
}

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

// partners.alisamadii.com calls these routes with the shared Client Hub
// session cookie (credentials: "include"), so the origin is echoed only when
// it's ours and credentials are allowed.
export const partnerCors = (req: Request, methods: string) => {
  const origin = req.headers.get("origin");
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    ...(allowed
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        }
      : {}),
    "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
};

// Production entry (Dockerfile CMD). Wraps the @astrojs/node standalone
// handler so every response — prerendered static files included, which bypass
// Astro middleware — carries the security headers below.
import http from "node:http";

process.env.ASTRO_NODE_AUTOSTART = "disabled";
const { handler } = await import("./dist/server/entry.mjs");

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3004);

http
  .createServer((req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(name, value);
    }
    handler(req, res);
  })
  .listen(port, host, () => {
    console.log(`agency listening on http://${host}:${port}`);
  });

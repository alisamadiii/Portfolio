// Secrets set via `wrangler secret put` (local dev: .dev.vars) — not in
// wrangler.jsonc, so `wrangler types` can't generate them. Merged into the
// generated Env interface.
interface Env {
  COOLIFY_API_TOKEN: string;
  DISCORD_WEBHOOK_URL: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}

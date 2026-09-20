# API callback / webhook URLs to update

The backend has moved out of the `portfolio` app into its own `api` app, served
at **`https://api.alisamadii.com`**. Every inbound callback, webhook, and OAuth
redirect that used to hit the portfolio host (`www.alisamadii.com`) must be
repointed to the new host.

These are configured **outside the repo** in third-party dashboards — code
changes alone won't move them. Work through this list when you cut over DNS.

Old host: `https://www.alisamadii.com` (and `https://alisamadii.com`)
New host: `https://api.alisamadii.com`

---

## Webhooks

| Service               | Where to change                                | New URL                                         |
| --------------------- | ---------------------------------------------- | ----------------------------------------------- |
| **Stripe**            | Dashboard → Developers → Webhooks → (endpoint) | `https://api.alisamadii.com/api/stripe/webhook` |
| **GitHub (per-repo)** | Each client repo → Settings → Webhooks         | `https://api.alisamadii.com/api/webhook/github` |

- **Stripe:** after repointing, re-verify the signing secret still matches
  `STRIPE_WEBHOOK_SECRET` in the api app's env. If Stripe issues a new secret
  for the endpoint, update the env.
- **GitHub:** new webhooks register automatically using `GITHUB_WEBHOOK_URL_BASE`
  (already set to `https://api.alisamadii.com` in the api app). Only the
  **existing** per-repo hooks need the URL changed by hand.

## OAuth redirect / callback URLs

The Better Auth server now runs on the api app, so every provider callback
`/api/auth/callback/<provider>` moves with it.

| Provider       | Where to change                                                                                | New redirect URI                                          |
| -------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Google**     | Google Cloud Console → APIs & Services → Credentials → OAuth client → Authorized redirect URIs | `https://api.alisamadii.com/api/auth/callback/google`     |
| **GitHub**     | GitHub → Settings → Developer settings → OAuth Apps → (app) → Authorization callback URL       | `https://api.alisamadii.com/api/auth/callback/github`     |
| **Cloudflare** | Cloudflare dash → Manage account → OAuth clients → (client) → Redirect URLs                    | `https://api.alisamadii.com/api/auth/callback/cloudflare` |

Add the new URI **before** cutover; you can leave the old one in place until the
migration is confirmed, then remove it.

## DNS

- Create **`api.alisamadii.com`** pointing at the new `api` deployment.

## Vercel project env (not a callback, but required for cutover)

Set on each app's Vercel project (Production + Preview):

| App                                            | Var                       | Value                                      |
| ---------------------------------------------- | ------------------------- | ------------------------------------------ |
| portfolio, hub, admin, motion, leads, template | `NEXT_PUBLIC_API_URL`     | `https://api.alisamadii.com`               |
| saaskit                                        | `VITE_API_URL`            | `https://api.alisamadii.com`               |
| api                                            | `NEXT_PUBLIC_API_URL`     | `https://api.alisamadii.com` (its own URL) |
| api                                            | `GITHUB_WEBHOOK_URL_BASE` | `https://api.alisamadii.com`               |

Also: deploy `apps/api` as its own Vercel project (root dir `apps/api`), and
point the existing portfolio project's root dir at `apps/portfolio`.

## Not affected

- **Polar** — currently display-only (no inbound webhook wired). If you later add
  a Polar webhook (`POLAR_WEBHOOK_SECRET`), its endpoint would also move to
  `https://api.alisamadii.com/...`.
- **Cron** — the `weekly-contact-report` Vercel Cron moved to the api app's
  `vercel.json` (in-repo); no dashboard change, just confirm it fires there.

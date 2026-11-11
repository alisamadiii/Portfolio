# Wix headless demo

A custom, hand-coded Astro site for a fictional business (Northline Plumbing & Heating) whose **FAQ** and **contact form** run on a Wix site. Show it to prospects who are on Wix and think they have to keep the template.

- `/` homepage: hero, services, FAQ (live from the Wix FAQ app), quote form (writes into Wix Forms)
- `/how-it-works` prospect-facing explainer
- `/blog` + `/blog/[slug]` posts from the Wix Blog app (published only), rich content rendered by `RichContent.astro`
- `/shop`, `/shop/[slug]`, `/cart`, `/shop/thank-you`: Wix Stores catalog, Wix cart, checkout on Wix's hosted page
- `/api/contact` server endpoint that creates the Wix form submission
- `/api/cart` (add / update / remove) and `/api/checkout` (303 to the Wix checkout)

Standalone project: not part of the pnpm workspace, own lockfile, own deploy.

## Run locally

```bash
cd demo/wix
cp .env.example .env   # fill WIX_CLIENT_ID (and WIX_FORM_ID once a form exists)
pnpm install
pnpm dev               # http://localhost:4321
```

## Wix setup

1. **Headless project.** Wix dashboard of the headless site → Settings → Headless settings → OAuth apps. Copy the **Client ID** into `WIX_CLIENT_ID`. The client secret is not needed (only for member login) and must never be committed.
2. **FAQ.** Install the Wix FAQ app on that site (Apps → FAQ). Categories and questions edited there appear on the homepage on the next reload. Answers are read as plain text.
3. **Contact form.** Dashboard → Forms & Submissions → New form. Add Name, Email, Phone, Message. Open the form; the GUID in the URL is the form id → `WIX_FORM_ID`. Inputs on the demo are rendered from that form's fields, so changing the form in Wix changes the demo. Spam protection "Advanced" on the form works with API submissions (tested); an explicit captcha field would fail with `INVALID_CAPTCHA`.

Submissions show up under Forms & Submissions and in the Wix Inbox, with the usual Wix email notifications.

## Deploy (Netlify)

New site from the `Portfolio` repo, **base directory `demo/wix`**, build command `pnpm build`, publish `dist` (both in `netlify.toml`). Env vars: `WIX_CLIENT_ID`, `WIX_FORM_ID`. SSR via `@astrojs/netlify`, every request fetches Wix, no CDN cache on purpose.

## Shop and payments

Products, cart and checkout are Wix's. The site adds items to the visitor's Wix cart (identity kept in the httpOnly `wix_session` cookie, refresh token included, so the cart survives across requests and Netlify functions), then `/api/checkout` creates a Wix checkout and redirects to Wix's hosted checkout page. Wix collects payment, tax and shipping and records the order; `thankYouPageUrl` brings the customer back to `/shop/thank-you`. To take real money: Wix dashboard → Settings → Accept Payments (needs a Wix plan that supports payments).

## How the Wix calls work

`src/lib/wix.ts` is a small REST wrapper. The client ID mints an anonymous visitor token (`POST /oauth2/token`), cached in memory until it expires. Endpoints used:

| What | Endpoint |
| --- | --- |
| FAQ categories | `POST /faq/v2/categories/query` |
| FAQ questions | `POST /faq/v2/question-entries/query` with `contentFormat: PLAIN_TEXT` |
| Form schema | `GET /form-schema-service/v4/forms/{formId}` |
| Create submission | `POST /form-submission-service/v4/submissions` |
| Products | `POST /stores/v3/products/query`, `GET /stores/v3/products/slug/{slug}?fields=VARIANT_OPTION_CHOICE_NAMES…` |
| Cart | `/ecom/v1/carts/current` + `/add-to-cart`, `/update-line-items-quantity`, `/remove-line-items` |
| Checkout | `POST /ecom/v1/carts/current/create-checkout` → `POST /_api/redirects-api/v1/redirect-session` → Wix-hosted checkout URL |
| CMS collections | `POST /wix-data/v2/items/query` with `dataCollectionId` (`services`, `stats`; seed CSVs in `cms/`) |
| Blog posts | `GET /blog/v3/posts`, `GET /blog/v3/posts/slugs/{slug}?fieldsets=RICH_CONTENT` |

Adding Bookings, Stores or anything else is the same pattern: one function in `wix.ts` calling the matching Wix REST endpoint, rendered by a section component. Reference: https://dev.wix.com/docs/rest (append `.md` to any docs URL for a plain-text version).

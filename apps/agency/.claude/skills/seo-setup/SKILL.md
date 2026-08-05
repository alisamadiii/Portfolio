---
name: seo-setup
description: Full SEO/metadata setup and audit for client websites (Astro, Next.js, any static site). Use when the user asks to improve SEO, fix search results appearance, fix favicons showing wrong icon in Google, add sitemaps/robots.txt, add structured data, set up Google Search Console, fix social share previews, or get sitelinks. Covers favicon generation from a logo, og-image, canonical domain, JSON-LD, robots.txt, sitemap, and GSC verification.
---

# SEO Setup

End-to-end SEO/metadata setup for a client site. Run the audit first — fix only what's broken.

## Phase 1: Audit (always do this first)

Check the LIVE site, not just the repo — Google sees production:

```bash
# Which domain is canonical? (www vs bare — one usually redirects)
curl -sI -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://DOMAIN/
curl -sI -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.DOMAIN/

# Asset availability
for p in favicon.ico robots.txt sitemap.xml sitemap-index.xml og-image.png; do
  curl -sI -o /dev/null -w "$p: %{http_code}\n" "https://CANONICAL_DOMAIN/$p"; done
```

Then in the repo, check:

1. **Favicon** — is `public/favicon.ico`/`favicon.svg` still the framework default (Astro rocket, Next triangle)? Google indexes `/favicon.ico` even when `<head>` points elsewhere. Download and view it.
2. **Canonical domain mismatch** — framework `site`/`metadataBase` config vs the domain that actually serves 200. Canonicals pointing at a redirecting domain suppress rankings and sitelink eligibility. This is the highest-impact single-line fix.
3. **og:image** — does the referenced file exist? 404 og-images are common after redesigns.
4. **robots.txt** — exists, with `Sitemap:` pointer?
5. **Sitemap** — generated? (Astro: `@astrojs/sitemap` in `astro.config.mjs`; Next: `app/sitemap.ts`.)
6. **JSON-LD** — grep `application/ld+json` in src. Usually absent.
7. **Meta gaps** — theme-color, og:image width/height/alt, twitter:card.
8. **Data bugs** — while in settings/config files, sanity-check phone numbers (E.164 digit count), emails, social URLs. These feed JSON-LD.

Report findings before fixing. Present as: root cause → fix → expected timeline.

## Phase 2: Fixes

### Favicon set from logo

Use `scripts/generate-brand-assets.mjs` (bundled; copy into the project's `scripts/` and adapt constants). Requires `sharp` + `png-to-ico` devDeps.

Key judgment calls:

- **View the logo first** (Read tool). A full lockup with text is unreadable at 16px — crop to the monogram/mark. Adjust the `extract` region after eyeballing.
- sharp runs `trim()` **before** `extract()` within one pipeline — use two passes (extract → buffer → trim).
- apple-touch-icon: opaque background (brand color), Apple convention.
- favicon.ico: multi-size 16/32/48 via png-to-ico. Google wants ≥48px.
- Delete leftover default `favicon.svg` if nothing references it.
- **Always view generated images** (Read tool) before shipping — check contrast/crop.

Head links (replace any remote/default icon links):

```html
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="BRAND_HEX" />
```

Plus `public/site.webmanifest` with name, short_name, 192/512 icons, theme_color.

### og-image (1200×630)

Same script: logo centered on brand background. If logo has light text, background must be dark (and vice versa). Add meta:

```html
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="SITE_NAME logo" />
```

### Canonical domain

Set framework site URL to the domain that serves 200 (usually `www.` if bare redirects). Astro: `site` in `astro.config.mjs`. Next: `metadataBase`. Then grep the whole repo for the wrong variant — configs often duplicate it.

### robots.txt

```
User-agent: *
Allow: /

Sitemap: https://CANONICAL_DOMAIN/sitemap-index.xml
```

### JSON-LD

One `@graph` script in the shared layout head, built from existing site config (don't hardcode what config already has):

- Business/org type: `NonprofitOrganization` (with `nonprofitStatus: "Nonprofit501c3"`), `LocalBusiness`, or `Organization` — pick what fits.
- Fields: name, url, logo, description, email, telephone (E.164 — verify digit count), PostalAddress, sameAs (social URLs).
- Plus `WebSite` with `publisher: {"@id": ".../#organization"}`.
- Render: `<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />` (Astro) or `dangerouslySetInnerHTML` (React).
- Skip BreadcrumbList unless site has deep hierarchy — marginal gain, adds prop drilling.

## Phase 3: Verify

1. Build; grep `dist/` (or `.next/`) output: canonical shows correct domain, sitemap URLs correct, all assets present.
2. `file public/favicon.ico` → must list multiple sizes.
3. View og-image and icons with Read tool.
4. After deploy: curl every asset on the live domain (200s), grep live HTML for canonical.
5. Validate JSON-LD at validator.schema.org if unsure.

## Phase 4: Google Search Console (user-facing steps)

Give the user these steps — they cannot be automated:

1. https://search.google.com/search-console → Add property. **Domain** type (needs DNS TXT) covers all subdomains; **URL prefix** with canonical URL allows HTML-file or meta-tag verification instead.
2. If HTML-file method: put the `googleXXXX.html` file in `public/` (content: `google-site-verification: googleXXXX.html`). Meta-tag method: add `<meta name="google-site-verification" content="...">` to layout head. Doing both is fine. **Deploy before clicking VERIFY** — Google fetches the live URL.
3. Sitemaps → submit `sitemap-index.xml` (filename only; GSC prepends domain). Sitemap-index → chunk files is standard, Google follows it.
4. URL Inspection → homepage URL → Request Indexing.
5. Keep verification file/tag forever — removal drops verification.

## Expectation-setting (always tell the user)

- New GSC property shows "Processing data, check again in a day or so" — normal; reports fill in 1–3 days. Sitemap submit + Request Indexing work immediately anyway.
- Favicon swap in SERPs: days–weeks after recrawl.
- Meta/canonical changes: 1–2 weeks.
- **Sitelinks: algorithmic, weeks–months, never guaranteed.** They appear for brand queries once Google trusts site structure. All you can do: consistent canonicals, structured data, clean sitemap, crawlable nav.
- Social preview caches (Facebook/WhatsApp): force refresh at developers.facebook.com/tools/debug/.
- Progress check: search `site:DOMAIN` weekly.

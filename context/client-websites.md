# Client websites

Client site designs live in the `client-websites` R2 bucket, one folder per client. Admins browse them in the Client Hub at `/client-websites` (sidebar, admins only): live previews, pages, the presentation deck, the showcase video, Stripe payment links, Google Maps + Claude Design info, and **Import**, which turns a design into a real upload project in Sites (for Ali, or for a client by email).

- Data + payments: `packages/trpc/src/routers/client-websites.ts` (admin tRPC), `lib/client-websites.ts`, `lib/client-websites-payments.ts`.
- File serving for the preview iframe: `apps/api/app/client-websites/[slug]/[[...path]]/route.ts` (admin session only), root-absolute asset rewrite in `apps/api/proxy.ts`, Stripe success page `apps/api/app/client-websites/paid`.
- R2: the api's own `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (they reach every bucket); bucket name is the constant `CLIENT_WEBSITES_BUCKET`. Optional api env `CLIENT_WEBSITES_ORIGIN_ADDRESS` = start of the driving route on the map.
- The agency site's public `/showcase` reads the same bucket on its own (`apps/agency/src/lib/showcase.ts`, `SHOWCASE_R2_*`).

## Bucket contract

This is what an uploader (the client-website-upload Claude skill) must write.

```
<slug>/                 lowercase letters, numbers, hyphens
  _meta.json
  index.html            required, at the top level
  about.html            or about/index.html
  images/...
  presentation.html     optional: client walkthrough deck, one self-contained file
  preview.mp4           optional: screen recording; lists the site on the agency /showcase
  preview.jpg           optional: poster frame for preview.mp4
```

- Upload over the S3-compatible API: endpoint `https://<account_id>.r2.cloudflarestorage.com`, region `auto`, bucket `client-websites`, key `<slug>/<path>`.
- Re-uploading a client: remove the objects under `<slug>/` that the new version no longer has, so files dropped from the design do not linger.
- Relative links and asset paths are safest. Root-absolute ones (`/images/x.png`, `/about`) also work in the hub preview (apps/api proxy.ts sends them back under the design by Referer).
- Content type is taken from the file extension when served, so the stored one does not matter.
- `presentation.html` is opened by the hub's Presentation button and is not listed as a site page. Without it the button reads "No presentation". Re-uploading a site without a deck keeps the deck already there.
- `preview.mp4` puts the site on the agency site's public `/showcase` (unless `showcase.hidden` is true). The agency only ever serves `preview.mp4`, `preview.jpg` and these `_meta.json` fields: `name`, `business` name/category/address/rating/reviewCount/hours, `showcase` (description = `showcase.summary`, `showcase.description` or top-level `description`). `design` is never shown. `presentation.html` is published at `/showcase/<slug>/presentation` with its speaker notes removed, but only when every note is an `<aside>`: a deck that keeps notes anywhere else (a `.notes` element, a notes array in its script) gets no Presentation button. Never the HTML. Keep the video small (H.264, 1080p or less, under ~20 MB) and with `faststart` so it plays before it fully loads. Re-uploading without a video or poster keeps the ones already there.

`_meta.json`: only `name` is required. Unknown keys are ignored. A folder with a missing or invalid file still shows up, under its slug.

```json
{
  "version": 1,
  "name": "Joe's Plumbing",
  "uploadedAt": "2026-11-05T18:30:00Z",
  "design": {
    "chatUrl": "https://claude.ai/design/...",
    "title": "Homepage v2",
    "notes": "Free text shown in the info panel"
  },
  "business": {
    "placeId": "ChIJ...",
    "name": "Joe's Plumbing",
    "address": "123 Main St, Orlando, FL 32801",
    "phone": "(407) 555-0100",
    "website": "https://joesplumbing.example",
    "rating": 4.8,
    "reviewCount": 127,
    "mapsUrl": "https://maps.google.com/?cid=...",
    "category": "Plumber",
    "hours": ["Monday: 8:00 AM - 5:00 PM"],
    "lat": 28.5383,
    "lng": -81.3792
  },
  "showcase": {
    "title": "Modern site for a family plumber",
    "summary": "Free text shown on the public showcase page",
    "features": ["Online booking", "Service area pages"],
    "industry": "home-services",
    "hidden": false
  }
}
```

Schema lives in `packages/trpc/src/lib/client-websites.ts` (types in `client-websites-shared.ts`).

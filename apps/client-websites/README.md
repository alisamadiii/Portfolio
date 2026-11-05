# client-websites

Viewer for client site designs stored in the `client-websites` R2 bucket. One folder per client; the app lists the folders and shows the chosen site with its Google Maps and Claude Design details.

## Bucket contract

This is what an uploader (the Claude Design skill, or `pnpm upload`) must write.

```
<slug>/                 lowercase letters, numbers, hyphens
  _meta.json
  index.html            required, at the top level
  about.html            or about/index.html
  images/...
  presentation.html     optional: client walkthrough deck, one self-contained file
```

- Upload over the S3-compatible API: endpoint `https://<account_id>.r2.cloudflarestorage.com`, region `auto`, bucket `client-websites`, key `<slug>/<path>`.
- Re-uploading a client: remove the objects under `<slug>/` that the new version no longer has, so files dropped from the design do not linger.
- Relative links and asset paths are safest. Root-absolute ones (`/images/x.png`, `/about`) also work in the deployed app.
- Content type is taken from the file extension when served, so the stored one does not matter.
- `presentation.html` is opened by the viewer's Presentation button and is not listed as a site page. Without it the button reads "No presentation". Re-uploading a site without a deck keeps the deck already there.

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
  }
}
```

Schema lives in `server/meta.ts`.

## Run

```
cp .env.example .env    # fill in the R2 token
pnpm --filter client-websites dev      # http://localhost:3027
```

Upload a folder by hand:

```
pnpm --filter client-websites upload ./my-design --slug joes-plumbing --name "Joe's Plumbing"
```

It reads `./my-design/_meta.json` if present (or `--meta <file>`), stamps `uploadedAt`, and replaces the whole `<slug>/` prefix. `--presentation <file>` stores that file as `presentation.html`. Needs a read and write token.

## Deploy (Coolify)

Dockerfile build pack, build context = repo root, Dockerfile `apps/client-websites/Dockerfile`, port `3027`, health check `/healthz`. Set `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `APP_USER`, `APP_PASSWORD`, `ORIGIN_ADDRESS`, `STRIPE_SECRET_KEY`. The server refuses to start in production without `APP_PASSWORD`.

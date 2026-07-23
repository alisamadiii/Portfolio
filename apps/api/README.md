# agency-api

Simple [Hono](https://hono.dev) API on [Cloudflare Workers](https://workers.cloudflare.com).

Consume it from apps with the typed client: [`@alisamadiillc/agency-api`](https://www.npmjs.com/package/@alisamadiillc/agency-api) (source in [`packages/api-client`](packages/api-client)). See [Using the client in your project](#using-the-client-in-your-project) for Vite, React, and Next.js guides.

## Using the client in your project

```sh
pnpm add @alisamadiillc/agency-api   # or npm install / yarn add
```

Every method returns `{ data, error }` — it never throws for API or network failures. Full API reference lives in the [package README](packages/api-client/README.md).

### Vite

Client-exposed env vars must be `VITE_`-prefixed. Add the key to `.env.local` (gitignored), then restart `pnpm dev`:

```
VITE_AGENCY_API_KEY=ak_pub_...
```

Create one shared client and import it everywhere:

```ts
// src/lib/agency.ts
import { AgencyClient } from "@alisamadiillc/agency-api";

export const agency = new AgencyClient(import.meta.env.VITE_AGENCY_API_KEY);
```

```ts
import { agency } from "@/lib/agency";

const { data, error } = await agency.emails.send({
  from: "noreply@yourdomain.com", // must be on your configured email domain
  to: "user@example.com",
  subject: "Welcome",
  html: "<p>Hello!</p>",
});
```

> **Note:** anything in a `VITE_` var ships to the browser. Only use an API key you are comfortable exposing to the client (scoped, rate-limited); otherwise proxy through your own backend.

For contact forms, use `emails.sendContact` — the API renders the notification email (name, message, source, device, IP, reply-to button) and delivers it to **your account email**; the caller never picks the recipient, so the browser-exposed key can't be used to spam anyone. Rate limited to **1 request per 10 minutes per IP** (`RATE_LIMIT_EXCEEDED`, 429).

```ts
const { data, error } = await agency.emails.sendContact({
  name: "Jane Doe",
  email: "jane@example.com", // becomes the Reply-To
  message: "Hi! I'd like to work with you.",
  source: "My Site — Contact Form", // optional; defaults to the page Origin
  metadata: { Phone: "+1 555 010 1234", Company: "Acme Inc" }, // optional extra fields, shown as a Details section
});
```

### React

Same client works in any React app. With [TanStack Query](https://tanstack.com/query), wrap sends in a mutation so you get `isPending`, `onSuccess`, and error handling for free — throw the returned `error` so React Query catches it:

```tsx
// src/services/agency.ts
import { useMutation } from "@tanstack/react-query";

import { agency } from "@/lib/agency";

type ContactInput = {
  name: string;
  email: string;
  message: string;
};

export const useSendContact = () =>
  useMutation({
    mutationFn: async (input: ContactInput) => {
      const { data, error } = await agency.emails.sendContact(input);
      if (error) throw error; // AgencyError: { status, code, message, causeHint }
      return data; // { id }
    },
  });
```

```tsx
const submit = useSendContact();

<form
  onSubmit={(e) => {
    e.preventDefault();
    submit.mutate(
      { name, email, message },
      { onSuccess: () => setSubmitted(true) }
    );
  }}
>
  <button type="submit" disabled={submit.isPending}>
    Send
  </button>
</form>;
```

Uploads work straight from the browser too — one call presigns and PUTs:

```ts
const { data, error } = await agency.uploads.upload(file, { path: "avatars" });
if (data) console.log(data.publicUrl);
```

### Next.js

Keep the API key **server-side** — use `AGENCY_API_KEY` (no `NEXT_PUBLIC_` prefix) in `.env.local` and only call the client from Server Components, Route Handlers, or Server Actions:

```ts
// lib/agency.ts
import "server-only";

import { AgencyClient } from "@alisamadiillc/agency-api";

export const agency = new AgencyClient(process.env.AGENCY_API_KEY!);
```

Route Handler:

```ts
// app/api/contact/route.ts
import { NextResponse } from "next/server";

import { agency } from "@/lib/agency";

export async function POST(req: Request) {
  const { name, email, message } = await req.json();

  const { data, error } = await agency.emails.sendContact({
    name,
    email, // becomes the Reply-To
    message,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
  return NextResponse.json(data); // { id }
}
```

Or a Server Action, callable directly from a form:

```ts
// app/actions.ts
"use server";

import { agency } from "@/lib/agency";

export async function sendContactEmail(formData: FormData) {
  const { data, error } = await agency.emails.sendContact({
    name: String(formData.get("name")),
    email: String(formData.get("email")),
    message: String(formData.get("message")),
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, id: data.id };
}
```

## Setup

```bash
pnpm install
pnpm dev          # wrangler dev — local workerd
```

Local: `http://localhost:8787` (wrangler default).

## Deploy

```bash
npx wrangler login   # once
pnpm deploy          # wrangler deploy
```

## Scripts

- `pnpm dev` — local dev server (workerd)
- `pnpm deploy` — publish to Cloudflare
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm cf-typegen` — regen Worker types from `wrangler.toml`

## Endpoints

| Method | Path                  | Body                                                      | Description                             |
| ------ | --------------------- | --------------------------------------------------------- | --------------------------------------- |
| GET    | `/`                   | —                                                         | service info                            |
| GET    | `/health`             | —                                                         | health                                  |
| POST   | `/v1/uploads/presign` | `{ bucket, filename, contentType, contentLength, path? }` | presigned R2 PUT URL                    |
| DELETE | `/v1/uploads`         | `{ bucket, key }`                                         | delete object from R2 (204; idempotent) |

## R2 file uploads (presigned)

Frontend uploads files **directly to R2** — the Worker only signs a short-lived PUT URL (never streams bytes).

### Setup

1. R2 → **Manage API Tokens** → create token with **Object Read & Write**. Note Access Key ID + Secret. Endpoint is `https://<account_id>.r2.cloudflarestorage.com`.
2. Local: copy `.dev.vars.example` → `.dev.vars`, fill in. Prod:
   ```bash
   wrangler secret put R2_ENDPOINT
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   ```
3. For **browser** uploads, enable CORS on each bucket (R2 → bucket → Settings → CORS): allow `PUT`, your origin, header `content-type`.

### `POST /v1/uploads/presign`

Body:

```json
{
  "bucket": "my-bucket",
  "filename": "photo.png",
  "contentType": "image/png",
  "contentLength": 1234,
  "path": "user/profile"
}
```

- `path` optional prefix; sanitized (no `..`). Key is server-generated: `<path>/<uuid>-<slug-filename>`.
- `contentLength` validated against 50 MB cap (`MAX_UPLOAD_BYTES` in `src/routes/uploads.ts`).

Response:

```json
{
  "uploadUrl": "https://...",
  "method": "PUT",
  "bucket": "...",
  "key": "...",
  "expiresIn": 900,
  "headers": { "Content-Type": "...", "Content-Length": "..." }
}
```

### Frontend flow

1. POST metadata to `/v1/uploads/presign` → get `uploadUrl` + `key`.
2. `PUT` file to `uploadUrl` with **raw** `fetch`/`axios` (third-party URL — **no** `Authorization` header) and the returned `headers`. The `Content-Type` sets the stored object's MIME.

URL expires in **15 min**. Test page: `pnpm dev`, open `http://localhost:8787/index.html`.

## Structure

```
public/
  index.html      # browser test page for uploads
src/
  index.ts        # export default app (Workers entry)
  app.ts          # Hono app, middleware, error handling, /v1 mount
  env.ts          # R2 secret bindings type
  routes/
    uploads.ts    # POST /v1/uploads/presign — R2 presigned URL
wrangler.toml     # Worker config + assets
```

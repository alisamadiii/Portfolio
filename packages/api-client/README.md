# @alisamadiillc/agency-api

TypeScript client for the agency API — send emails and manage uploads with full type safety. Zero dependencies, works in Node 18+, browsers, and edge runtimes.

## Install

```sh
npm install @alisamadiillc/agency-api
```

## Quickstart

Create a shared client once:

```ts
// lib/agency.ts
import { AgencyClient } from "@alisamadiillc/agency-api";

export const agency = new AgencyClient(process.env.AGENCY_API_KEY!);
// custom base URL: new AgencyClient(key, { baseUrl: "http://localhost:8787" })
```

Then import it anywhere:

```ts
import { agency } from "@/lib/agency";

const { data, error } = await agency.emails.send({
  from: "hello@yourdomain.com",
  to: "user@example.com", // or ["a@example.com", "b@example.com"]
  subject: "Welcome",
  html: "<p>Hello!</p>",
});

if (error) {
  console.error(error.code, error.message); // e.g. "RATE_LIMIT_EXCEEDED"
} else {
  console.log(data.id);
}
```

Every method returns `{ data, error }` — it never throws for API or network failures.

## Contact form

`sendContact` is made for public contact forms: the API renders the notification email (name, message, source, device, IP, a reply button) and delivers it to **your account email** — the caller never chooses the recipient, so a browser-exposed key can't be used to spam anyone. The visitor's address becomes the Reply-To.

```ts
const { data, error } = await agency.emails.sendContact({
  name: "Jane Doe",
  email: "jane@example.com",
  message: "Hi! I'd like to work with you.",
  subject: "Project inquiry", // optional; defaults to "New contact from Jane Doe"
  source: "My Site — Contact Form", // optional; defaults to the page Origin
  metadata: {
    // optional; any extra form fields your site collects —
    Phone: "+1 555 010 1234", // rendered as a Details section in the email
    Company: "Acme Inc",
    Budget: "$5k–10k",
  },
});
```

Rate limited to **1 request per 10 minutes per IP** — surface `RATE_LIMIT_EXCEEDED` (429) as a "please try again in a few minutes" message.

## Uploads

One-call upload (presign + PUT handled for you):

```ts
const { data, error } = await agency.uploads.upload(file, {
  path: "avatars",
  naming: "uuid-filename", // "filename" | "uuid" | "uuid-filename"
});

if (data) console.log(data.publicUrl);
```

Or do the two steps yourself:

```ts
const { data: presign } = await agency.uploads.presign({
  filename: file.name,
  contentType: file.type,
  contentLength: file.size,
});

// Plain fetch — the signature is in the URL. Do NOT add an
// Authorization header here; it breaks the signature.
await fetch(presign!.uploadUrl, {
  method: "PUT",
  headers: presign!.headers,
  body: file,
});
```

List and delete:

```ts
const { data } = await agency.uploads.list({ prefix: "avatars/" });
// data.objects: [{ key, size, lastModified, url }], data.nextCursor for paging

await agency.uploads.delete({ key: "avatars/photo.jpg" });
```

## Who am I

```ts
const { data } = await agency.me.get();
// data.keyPrefix, data.user.email, data.user.bucketName, ...
```

## Email history

```ts
const { data } = await agency.emails.list({ limit: 20 });
// data.emails: [{ id, kind, from, to, subject, createdAt, ... }], newest first
// Next page: pass the last row's createdAt as `before`.

const { data: html } = await agency.emails.getHtml(data.emails[0].id);
// html.url — presigned link to the archived HTML, dies in ~60s
```

## Admin

Every `/v1/admin/*` route, 1:1. Requires a key whose user has type `"admin"` — anything else gets `ADMIN_REQUIRED`. Never ship an admin key to a browser; call these server-side (or behind a server-side proxy).

```ts
// Keys
const { data: keys } = await agency.admin.keys.list(); // + owner email/name
const { data: created } = await agency.admin.keys.create({
  userId: "user-id", // or email: "client@acme.com"
  type: "server", // default "public"
});
created.key; // full value — returned only here and via reveal
await agency.admin.keys.reveal(created.id); // { key } — 410 if revoked
await agency.admin.keys.revoke(created.id); // soft; { permanent: true } deletes

// Users (API user = portfolio account + API settings)
const { data: users } = await agency.admin.users.list();
const { data: user } = await agency.admin.users.get("user-id"); // 200 with null fields if no settings yet
const { data: full } = await agency.admin.users.lookup("client@acme.com"); // + active keys, decrypted
await agency.admin.users.create({
  email: "client@acme.com",
  bucketName: "acme-media", // verified to exist in R2
  publicBaseUrl: "https://media.acme.com", // verified to serve that bucket
  emailDomain: "acme.com", // verified in SES
  allowedOrigins: ["acme.com"],
}); // auto-mints a key, returned once as .apiKey
await agency.admin.users.update("user-id", { emailDomain: "acme.com" }); // settings upsert + same verification
await agency.admin.users.delete("user-id"); // removes API access, keeps the account

// Email usage (per user — the admin counterpart of agency.emails.list())
const { data: usage } = await agency.admin.emailLogs.list({
  userId: "user-id",
  limit: 10,
});
usage.stats; // { total, thisMonth, send, contact, lastSentAt }

// Env backups (metadata only; content requires the vault password)
const { data: envs } = await agency.admin.envs.list({ email: "client@acme.com" });
const { data: dotenv } = await agency.admin.envs.reveal("env-id", "vault-password"); // raw .env text

// Health
await agency.admin.sesHealth(); // SES account/identities/statistics
await agency.admin.health(); // live Neon/KV/SES/R2 probe (503 when degraded)
```

Config edits are verified server-side before they're saved: a missing bucket, an unreachable public URL, or an unverified SES domain fails with `BUCKET_NOT_FOUND`, `PUBLIC_URL_UNREACHABLE` / `PUBLIC_URL_NOT_SERVING` / `PUBLIC_URL_WRONG_BUCKET`, or `EMAIL_DOMAIN_NOT_VERIFIED`.

## Errors

`error` is an `AgencyError` with:

| field       | meaning                                |
| ----------- | -------------------------------------- |
| `status`    | HTTP status (`0` for network failures) |
| `code`      | stable identifier, safe to branch on   |
| `message`   | human-readable, one line               |
| `causeHint` | optional: why it happened / how to fix |

`code` is typed as `AgencyErrorCode` — a union of every code the API returns, so you get autocomplete when branching:

```ts
if (error.code === "FILE_ALREADY_EXISTS") {
  /* ... */
}
```

Common codes: `MISSING_API_KEY`, `UNKNOWN_API_KEY`, `API_KEY_REVOKED`, `VALIDATION_FAILED`, `RATE_LIMIT_EXCEEDED` (contact form, 1 per 10 min per IP), `SENDER_DOMAIN_MISMATCH`, `EMAIL_DOMAIN_NOT_CONFIGURED`, `BUCKET_NOT_CONFIGURED`, `FILE_ALREADY_EXISTS`, `OBJECT_NOT_FOUND`, `NETWORK_ERROR`.

## Limits

- Uploads: 50 MB max per file; presigned URLs expire after 15 minutes.
- Emails: `from` must be on your configured domain (`send`); `sendContact` is limited to 1 request per 10 minutes per IP.

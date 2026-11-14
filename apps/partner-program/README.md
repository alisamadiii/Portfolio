# Partner Program (React + Vite)

Landing page and multi-step application for the Ali Samadii LLC Partner Program.

| Route    | Page |
|----------|------|
| `/`      | Landing page: hero, how it works, earnings calculator, who it's for, what we build, FAQ, apply CTA |
| `/apply` | 4-step application: About you → Your network → Partner agreement (read + sign) → Review → Thank you + PDF download |

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the build locally
```

## Before going live: fill these in

Open **`src/config.ts`**. Anything in `[square brackets]` shows up highlighted on the page until you replace it:

- `payoutDays`, `paymentMethod`, `paymentMethodExamples`
- `approvalDays`
- `refundPolicy`
- `taxNote`, `governingLaw`
- `agreementVersion` (bump it whenever the agreement text changes)

The agreement text itself is in **`src/apply/AgreementText.tsx`**. It's a draft: have a lawyer review it, and keep `packages/ui/src/pdfs/partner-agreement.tsx` (the signed PDF) in sync.

## Backend contract

The app sends one request when the applicant presses **Submit application**:

`POST /api/partners/apply` with `Content-Type: application/json`

```json
{
  "fullName": "Jordan Reyes",
  "email": "jordan@example.com",
  "phone": "(904) 555-0142",
  "occupation": "Barber",
  "city": "Jacksonville",
  "knowOwners": "…",
  "whyJoin": "…",
  "agreement": {
    "version": "2026-11",
    "accepted": true,
    "signature": "Jordan Reyes",
    "initials": "J.R.",
    "signedAt": "2026-11-14T15:04:05.000Z"
  }
}
```

`phone` is `null` when left blank.

**Response:** any 2xx status counts as success. Optionally return JSON:

```json
{ "id": "app_123", "pdfUrl": "https://…/signed-agreement.pdf" }
```

If `pdfUrl` is present, the "Download PDF" button on the thank-you screen uses it. If not, the PDF row is hidden. Any non-2xx status or network error shows the friendly error and keeps the applicant's answers.

The type definitions are in `src/lib/api.ts`.

### API on another domain

Copy `.env.example` to `.env` and set `VITE_API_BASE=https://api.yourdomain.com`.
In development, `vite.config.ts` proxies `/api` to `http://localhost:3000`; change the target if your API runs elsewhere.

## Where things live

```
src/
  config.ts              ← placeholders, contact info, API URLs
  styles/global.css      ← all styles; colors and sizes are CSS variables at the top
  lib/
    api.ts               ← submitApplication() + payload types
    money.ts             ← money formatting, 40% payout math
    motion.ts            ← scroll reveal, scroll progress bar, count-up number
  components/            ← Header, Footer, Logo, Icons, Eyebrow, Ph (placeholder highlight)
  sections/              ← one file per landing page section
  apply/
    form.ts              ← fields, steps, validation rules
    Steps.tsx            ← the four step screens
    AgreementText.tsx    ← agreement text (draft)
    Done.tsx             ← thank-you screen with PDF download
    Field.tsx            ← labelled input/textarea with inline error
  pages/
    LandingPage.tsx
    ApplyPage.tsx        ← step logic, focus handling, submit
```

## Notes

- **Logo:** `public/logo.png`, the same file as www.alisamadii.com, rendered by `src/components/Logo.tsx`.
- **Motion:** sections fade up on scroll (add `data-reveal` to any element to opt in; `data-reveal="2"`–`"4"` stagger it). Everything respects the visitor's "reduce motion" setting.
- **Accessibility:** real labels, inline errors linked with `aria-describedby`, coral-ink focus rings (`#C2502F` passes contrast; bright coral doesn't), focus moves to each new step's heading, and the agreement checkbox unlocks only after the text is scrolled to the end.
- **Hosting:** it's a single-page app, so make your host send `index.html` for `/apply` (Netlify: add `public/_redirects` with `/*  /index.html  200`).

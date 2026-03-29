# Product Requirements Document

## What this is

Ali Samadi's personal SaaS monorepo — a production-grade, multi-app platform that serves as his portfolio, agency business, animation component library, and internal tooling. It is not a client project; Ali is the owner, operator, and sole developer.

The monorepo powers three distinct revenue surfaces and one internal surface, all sharing the same auth, database, payments, and component infrastructure.

---

## Revenue surfaces

### 1. Motion — Animation component library (`/apps/motion`)

**Purpose:** A premium collection of React animation components that developers can purchase and use in their own projects.

**Model:** Freemium. Some animations are free and publicly viewable; premium animations are paywalled behind a one-time purchase or subscription via Polar.

**User flow:**

1. Visitor browses the animation gallery on the landing page
2. Clicks an animation to open its interactive viewer (`/m/[slug]`)
3. In the viewer: live preview, source code toggle, theme switching, responsive scaling, keyboard shortcuts
4. Premium animations show a paywall — user purchases via Polar checkout
5. On success, user gets access to source code

**Key details:**

- Animations are stored as source files in the DB (`agencySource`, `agencySourceFile` tables)
- Admin manages animation metadata and source code via the admin panel (`/code`)
- Previous customers (lapsed/existing buyers) get a upsell banner

---

### 2. Agency — Web development services (`/apps/agency`)

**Purpose:** Ali's client-facing agency website where businesses can browse services and subscribe to ongoing web development and hosting plans.

**Model:** Subscription-based with tiered pricing. Clients pay a monthly fee for a set number of pages; additional pages are available as add-ons.

**User flow:**

1. Visitor lands on the agency marketing site (hero, services, process, testimonials)
2. Signs up / logs in
3. Enters the customer portal (`/portal`) to browse product tiers
4. Selects a plan and configures extra pages — real-time price calculation
5. Checks out via Polar
6. Returns to portal to manage subscription, view orders, contact support

**Portal sections:**

- **Products** — tier selection and page count configurator
- **Customer** — profile and account settings
- **Orders** — order history
- **Support** — support request form

**Key details:**

- Pricing tiers and page limits are defined in `agencyProduct` DB table, managed from admin
- Extra pages add $30–$110/month depending on tier
- Polar handles subscriptions and webhooks

---

### 3. Portfolio — Personal site and blog (`/apps/portfolio`)

**Purpose:** Ali's public-facing personal portfolio. Showcases his work, tech stack, projects, and writing. Also serves as the primary auth entry point for users who access the broader platform.

**Model:** Content + lead generation. Potentially subscription-gated premium content.

**Key sections:**

- Landing page: skills, projects, work experience, tech stack
- Blog: MDX-powered posts at `/(posts)/[...slug]`
- Auth: sign up, log in, email verification, password reset, OAuth (Google, GitHub)
- Plan chooser: post-signup subscription tier selection
- Settings: avatar, email, name, company, linked accounts, billing portal, danger zone
- Success page: post-payment confirmation

**Key details:**

- MDX content powered by `@content-collections/core`
- Client work showcase pages (e.g., Crosspost) live as special routes under `/(posts)`
- Billing portal links to Polar invoice history

---

### 4. Admin — Internal operations panel (`/apps/admin`)

**Purpose:** Ali's private internal tool for managing the entire platform — users, products, agency subscriptions, animation source code, discounts, and cold email campaigns.

**Access:** Admin role required (enforced at layout level via Better Auth).

**Key sections:**

- **Users** — full user list with search, sort, filter, ban status, pagination; user detail with payments tab and profile tab
- **Agency** — agency product management, create new product tiers, view/edit individual products
- **Products** — view all Polar products and payment records
- **Discounts** — discount code management
- **Code** — animation source file editor; create/edit animation metadata and file contents
- **Cold emails** — campaign management for outreach

---

## Supporting apps

### Docs (`/apps/docs`)

Technical documentation site powered by Fumadocs. MDX content, sidebar navigation, search, table of contents, OG image generation, AI copy button, GitHub source links.

### Motion showcase (`/apps/motion`)

Also serves as the primary showcase for the animation library (see Revenue surface #1 above).

### Template (`/apps/template`)

A reusable SaaS landing page template that gets forked and deployed for new external clients via the `/client` command. Contains all standard marketing sections: Hero, AppOverview, TechStack, Architecture, Payments, Security, Mobile, Docs, Checklist, FAQ, CTA.

---

## Shared packages

| Package              | What it does                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@workspace/auth`    | Better Auth config — email/password, OAuth (Google, GitHub), email OTP, admin role, Polar payment plugin, cross-subdomain cookies. Exports `useUser`, `useAdmin`, `useFunctions`, `usePayments` hooks.                                                                               |
| `@workspace/trpc`    | All tRPC routers and procedures. Procedures: `baseProcedure`, `authenticatedProcedure`, `adminProcedure`, `notificationsProcedure`. Routers cover: admin, agency, motion, payments, user, sessions, discounts, upload, verification, previousCustomer, notifications.                |
| `@workspace/drizzle` | Drizzle ORM schema + Neon PostgreSQL client. Tables: user, account, session, verification, order, product, subscription, previousCustomers, webhookEvents, agencyProduct, agencySource, agencySourceFile.                                                                            |
| `@workspace/ui`      | Shared component library built on shadcn/ui. Includes design system components, icons, custom components (DataTable, SuccessPurchaseDialog, TabLineAnimate, BgPattern, RequestDialog), agency-specific components, animation SVGs, providers, hooks, and global CSS/theme variables. |
| `@workspace/email`   | Resend integration. Templates: email verification, password reset, order confirmation, subscription cancellation.                                                                                                                                                                    |

---

## Data model — key entities

| Table               | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| `user`              | Better Auth users. Extended with phone, company, address, metadata.             |
| `account`           | OAuth provider links (Google, GitHub).                                          |
| `session`           | Auth sessions.                                                                  |
| `verification`      | OTP codes for email verification.                                               |
| `order`             | Polar orders. Links to product, customer, subscription.                         |
| `product`           | Polar products. Includes pricing, recurring interval, service type.             |
| `subscription`      | Active Polar subscriptions.                                                     |
| `previousCustomers` | Email list for lapsed/past buyers (used for upsell banners).                    |
| `webhookEvents`     | Polar webhook event log.                                                        |
| `agencyProduct`     | Agency subscription tiers — name, pricing, page limits, description (markdown). |
| `agencySource`      | Animation metadata — title, description, slug, isPremium, image.                |
| `agencySourceFile`  | Animation source code files, linked to `agencySource`.                          |

---

## Auth and payments

**Auth:** Better Auth with Drizzle adapter. Supports email/password, email OTP verification, password reset, OAuth (Google, GitHub), account linking, admin role. Cross-subdomain cookies enable SSO across all apps.

**Payments:** Polar is the primary payment processor. Handles one-time purchases (motion library) and recurring subscriptions (agency portal). Webhooks sync order/subscription state into the local DB via `webhookEvents`. Stripe may also be integrated.

---

## Infrastructure

| Concern         | Solution                                            |
| --------------- | --------------------------------------------------- |
| Hosting         | Vercel — per-app deployments                        |
| Database        | Neon PostgreSQL (serverless)                        |
| Package manager | pnpm workspaces                                     |
| Build system    | Turborepo                                           |
| Email           | Resend                                              |
| Payments        | Polar (+ Stripe)                                    |
| Notifications   | ClickUp integration via tRPC `notifications` router |

---

## Business goals

1. **Motion library** — sell access to premium animation components to developers
2. **Agency portal** — acquire and retain web development clients on recurring subscriptions
3. **Portfolio** — establish credibility, attract inbound leads, publish technical writing
4. **Admin** — give Ali full operational visibility and control without relying on third-party dashboards
5. **Template** — accelerate new client site deployments by forking a production-ready base

---

## What Claude should prioritize

- Understand which app a task belongs to before writing code — each app has its own conventions built on shared packages
- All internal data goes through tRPC — never `fetch` directly from components
- Auth state comes from `@workspace/auth` hooks — never re-implement auth checks
- Payment state (subscriptions, orders) is synced via Polar webhooks — read from DB, never call Polar directly from the frontend
- Admin features use `adminProcedure` — never expose admin routes via `authenticatedProcedure`
- Ali runs all DB migrations — never suggest or run `db:push` or `db:migrate`

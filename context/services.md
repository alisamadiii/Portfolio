# Agency Service Catalog

> Interview conducted: 2026-04-05
> Model: All-monthly recurring, no one-time fees

## Business Model

- **Billing**: Everything monthly — website build cost amortized into the subscription
- **Two layers**: Default plans (Starter/Pro) for self-serve + granular service catalog for custom products
- **Design approach**: Template-based (customized pre-built templates)
- **Client types**: Small local businesses + SMBs/startups
- **Payments**: Polar (products created in Polar, metadata tracks userId/services)

## Default Plans

Standard products available to all clients (no `userId` in Polar metadata).

### Starter — $299.99/month

A fully managed web presence for small businesses.

- 3-page website (landing page + 2 additional pages)
- Website hosting provisioning and uptime management
- Domain registration, DNS configuration, and renewal
- Business email account setup and administration
- Ongoing website updates and maintenance
- Priority technical support via agency@alisamadii.com

### Pro — $649.99/month

The full stack — auth, admin, and email infrastructure. Includes everything in Starter, plus:

- User authentication system (sign up, login, password reset)
- Admin panel for basic content management
- AWS SES domain integration for transactional email delivery
- Dedicated virtual payment card for service billing
- Monthly performance and uptime report

## Granular Service Catalog (for custom products)

Used when creating custom products for specific clients via admin panel. Each service is a separate line item with adjustable pricing.

### Infrastructure

| ID | Service | Default Price/mo | Description |
|----|---------|-----------------|-------------|
| `hosting` | Hosting & Uptime Management | $29 | Website hosting, server config, uptime monitoring, incident response |
| `domain` | Domain & DNS Management | $15 | Domain registration, DNS config, SSL certificate, annual renewal |
| `business_email` | Business Email | $15 | Professional email setup (Google Workspace/custom SMTP), config, admin |
| `database` | Database Management | $29 | Neon PostgreSQL provisioning, backups, and monitoring |

### Development

| ID | Service | Default Price/mo | Description |
|----|---------|-----------------|-------------|
| `website_design` | Website Design & Development | $76 | Template-based multi-page site (5 pages included), fully customized |
| `web_app` | Web App Development | $199 | Dashboards, portals, SaaS tools — auth, CRUD, integrations |
| `contact_form` | Contact Form & Email Automation | $29 | Contact form with email forwarding, auto-responders, spam protection |
| `maintenance` | Ongoing Maintenance | $69 | Updates, dependency patches, content changes, bug fixes |

### Growth

| ID | Service | Default Price/mo | Description |
|----|---------|-----------------|-------------|
| `seo` | SEO Setup & Optimization | $49 | Technical SEO, metadata, sitemap, structured data, Core Web Vitals |
| `analytics` | Analytics Integration | $15 | GA4 or privacy-first analytics with goal tracking and reporting |
| `priority_support` | Priority Technical Support | $39 | Priority support via email with guaranteed response time |

## Extra Pages (tiered, monthly)

Base website includes pages per plan (Starter: 3, custom: 5). Additional pages:

| Tier | Pages | Price per page/mo |
|------|-------|-------------------|
| 1 | 1–5 | $25 |
| 2 | 6–10 | $40 |
| 3 | 11–15 | $60 |

Maximum 15 extra pages per client.

## Deferred / Future Services

- **E-Commerce Integration** — Stripe-based custom storefront (deferred)
- **AI Feature Integration** — Chatbots, content generation, smart search (planned)
- **Mobile App Development** — React Native cross-platform apps (not offering yet)

## Interview Notes

- Ali is a solo operator running all services himself
- Template-based design (no custom Figma from scratch)
- No standalone services — everything is part of a full project engagement
- SEO + Analytics included in standard recommendation for every client
- Default plans are Polar products with no userId in metadata (standard products)
- Custom products are Polar products with userId in metadata (user-specific)
- Admin panel at /admin/agency/create is used to build custom products from the granular catalog

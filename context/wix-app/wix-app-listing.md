# Wix app: Client Hub

Everything needed to fill in the Wix App Dashboard for the hub's Wix app.
Files in this folder:

- `app-icon-1000.png` (1000 x 1000, App icon)
- `screenshot-1-blog.png`, `screenshot-2-leads.png`, `screenshot-3-overview.png` (1600 x 1200, 4:3, Media)

> The app is shared with clients through a **share install link** (unlisted), so
> "Publish to App Market" blockers don't stop it from working. Fill these in
> anyway so the app looks complete when a client installs it.

---

## 1. App Info

**App name**
```
Client Hub
```

**Teaser** (48 characters max, no "Wix")
```
Run your site, blog and leads in one place
```

**Feature 1**
```
Edit, publish and delete blog posts from one dashboard
```

**Feature 2**
```
Turn every form submission into a lead you can follow up
```

**Feature 3**
```
See orders, bookings and contacts next to your website and leads
```

**Feature 4**
```
No passwords shared: you choose the site and approve access
```

**Full description** (1200 characters max, no "Wix")
```
Client Hub is the dashboard Ali Samadii LLC gives its clients to run their online business in one place: website, leads, business info and the tools behind them.

Connect your site and Client Hub brings its data next to everything else:

- Blog: see every post, live or draft. Write new posts, edit titles, excerpts and text, publish when ready, and delete posts (they go to the trash, so nothing is lost).
- Form leads: every form submission can be imported into your Client Hub leads inbox, where you track status and follow-ups. Each submission is imported once, never duplicated.
- Contacts, orders and bookings: see your latest contacts, store orders and upcoming bookings without opening your site's dashboard.

You stay in control. You pick which site to connect, you see exactly what the app can access, and you can remove it any time from Manage Apps. Your site, your account and your data stay yours.
```

**Wix demo site URL**: leave empty, or add a Wix test site once one is set up.

**App icon**: upload `app-icon-1000.png`.

---

## 2. Media (Add some images)

Upload in this order:

1. `screenshot-1-blog.png`: Edit your Wix blog from one dashboard
2. `screenshot-2-leads.png`: Every Wix form submission becomes a lead
3. `screenshot-3-overview.png`: Orders, bookings and contacts at a glance

---

## 3. Company Info

| Field | Value |
|---|---|
| Company name | Ali Samadii LLC |
| Logo | `app-icon-1000.png` |
| Website | https://www.alisamadii.com |
| Address | _your business address_ |
| Privacy policy | https://www.alisamadii.com/privacy |
| Terms of use | https://www.alisamadii.com/terms |

**Company description**
```
Ali Samadii LLC is a web agency that designs, builds and manages websites for small businesses, and gives every client Client Hub: one dashboard for their website, leads and business tools.
```

---

## 4. Contact Info

| Field | Value |
|---|---|
| Support email | a@alisamadii.com |
| Billing email | a@alisamadii.com |
| Urgent matters email | a@alisamadii.com |
| Phone | (971) 382-8969 |

---

## 5. Get Found

**Category**: Marketing, or Site Management / Business Tools (whichever is closest in the list).

**Search keywords** (5 max)
```
dashboard
blog
leads
agency
client portal
```

---

## 6. Permissions (Develop > Permissions)

Add with **Search by name or ID**:

| Scope ID | Name | Used for |
|---|---|---|
| `SCOPE.DC-BLOG.READ-BLOGS` | Read Blog | live posts |
| `SCOPE.DC-BLOG.READ-DRAFT-POSTS` | Read Draft Blog Posts | drafts |
| `SCOPE.DC-BLOG.MANAGE-BLOG` | Manage Blog | create, edit, publish, delete |
| `SCOPE.DC-RICOS.MANAGE-DOCUMENTS` | Manage Ricos Document | post text <-> Markdown |
| `SCOPE.DC-MEMBERS.READ-MEMBERS` | Read Members | author of new posts |
| `SCOPE.FORMS.VIEW-FORM` | View Forms | form names |
| `SCOPE.FORMS.MANAGE-SUBMISSIONS` | Manage form submissions | reading submissions (read only in the hub) |
| `SCOPE.DC-CONTACTS.READ-CONTACTS` | Read Contacts | Contacts tab |
| `SCOPE.DC-STORES.READ-ORDERS` | Read Orders | Orders tab |
| `SCOPE.DC-BOOKINGS.MANAGE-BOOKINGS` | Manage Bookings | Bookings tab (read only in the hub) |
| `SCOPE.DC-SITES.READ-URLS` | Read Site URLs | site address |
| `SCOPE.DC.MANAGE-YOUR-APP` | Manage Your App | business name, phone, address |
| `SCOPE.PROMOTE.MANAGE-SEO` | Manage SEO Settings | which Wix apps the site uses |

Open issue: saving permissions on the app "Ali Samadii LLC - Oauth" fails with
"You don't have permission to do this" (request ID 1794655265.40541229440311488).
Try a fresh app from the personal account, or send that ID to Wix support.

---

## 7. Security & Privacy questionnaire

Answers to use:

- **What data does the app access?** Blog posts, form submissions, contacts, store orders, bookings, site URLs and basic business info of the site it is installed on.
- **Why?** To show it to the site owner in Client Hub, let them manage blog posts, and import form submissions into their leads inbox.
- **Is data stored?** Only form submissions the owner chooses to import (as leads in Client Hub). Blog posts, contacts, orders and bookings are read live and not stored.
- **Is data shared or sold?** No. Never shared with third parties, never sold.
- **Where is it stored?** Postgres database (Neon) used by Client Hub, encrypted at rest and in transit (HTTPS).
- **Who can see it?** Only the site owner and the people they invite to their project in Client Hub.
- **How is data deleted?** Disconnecting the app in Client Hub stops all access. Imported leads can be deleted in Client Hub, or on request to a@alisamadii.com.
- **Authentication**: OAuth (client credentials with the app instance). No Wix passwords are collected.

---

## 8. Extension (only needed for App Market listing)

The hub doesn't need one: it works fully outside Wix. If Wix insists before
release, add the simplest **Dashboard Page** extension pointing to
`https://app.alisamadii.com` (opens Client Hub).

---

## 9. After it saves

1. **Develop > OAuth**: copy **App ID** and **App secret** into Coolify (api service):
   `WIX_APP_ID`, `WIX_APP_SECRET`.
2. **Release a version**.
3. **Distribute > Share install link** > Generate > open it, copy the ID from
   `wix.com/app-market/install/<ID>` into `WIX_SHARE_URL_ID`.
4. Redeploy the api service, then in Client Hub: project > Apps > Wix > Connect Wix.

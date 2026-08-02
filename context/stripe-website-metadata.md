# Stripe Customer Metadata — Client Website

Powers the portal `/website` page (`trpc.websites.getMine`). Set these on the
**Stripe customer** (Dashboard → Customers → select customer → Metadata → Edit).
Matched to the portal user by email. Changes appear after the cache TTL (~minutes).

## Keys (copy-paste)

```
website_domain
website_repo
website_label
```

## Example values

| Key              | Example                   | Notes                                                                                          |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `website_domain` | `acme.com`                | **Required** — no card without it. Bare host; `https://` and paths are stripped automatically. |
| `website_repo`   | `alisamadiillc/acme-site` | Optional. `owner/repo` → links to `https://github.com/owner/repo`.                             |
| `website_label`  | `Marketing site`          | Optional display name. Falls back to the domain.                                               |

One website per Stripe customer. Status dot = live probe of `https://<website_domain>` (up when response < 500, 8s timeout).

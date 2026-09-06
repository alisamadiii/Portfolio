# VPS + Coolify Runbook

How to set up a new VPS with Coolify from zero: buy the server, deploy the apps, wire up backups, lock it down. Written after setting up the production box on 2026-09-02. Follow top to bottom for a new server; jump to a section when adding a single piece.

**Current production box:** Hostinger KVM4 (4 vCPU / 16 GB / 200 GB), Boston, IP `2.25.105.158`, `srv1944792.hstgr.cloud`, Coolify v4.3.14. Expires 2028-08-31 — re-shop pricing around month 23 (renews at $28.99/mo).

---

## 1. Buy the VPS

- Hostinger VPS (KVM line). Pick a US East location (Boston) — geography dominates TTFB for US visitors.
- KVM4 (16 GB RAM) comfortably runs the whole fleet: 4 Next.js apps + 1 Astro site + 3 open-source services at ~10% CPU / 27% RAM.
- Look for a coupon before checkout (BYTEGRAD worked in 2026: $11.69/mo effective on 24-mo term).
- Choose the Coolify OS template if offered, otherwise plain Ubuntu 24.04 and install Coolify manually:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

- Coolify UI comes up on `http://<server-ip>:8000`. Create the admin account immediately (first visitor becomes admin).

### Coolify gotchas (learned the hard way)

- Onboarding UI double-click can create duplicate projects — click once, wait.
- The "API access" toggle sometimes fails to save. Fallback:
  `docker exec coolify-db psql -U coolify -d coolify -c "UPDATE instance_settings SET is_api_enabled = true;"` then create a token via artisan.
- Paste env vars through the Developer view (raw editor), not one-by-one.
- After adding a domain to an already-deployed app, hit **Redeploy** — Traefik labels only refresh on deploy, otherwise you get 503.

## 2. Connect GitHub

- Coolify → Sources → add GitHub App. One app per GitHub account/org (personal + `alisamadiillc-templates`).
- A GitHub App can be transferred to an org later: GitHub App settings → Advanced → Transfer ownership.

## 3. Deploy the monorepo apps (Next.js / Astro)

Recipe that works for the pnpm turbo monorepo — base directory must stay at the repo root (`workspace:*` breaks otherwise):

| Setting | Value |
|---|---|
| Build pack | Railpack (handles Next 16 + pnpm out of the box) |
| Base directory | `/` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm turbo build --filter=<app>` |
| Start command | `pnpm --filter <app> start` |

- Add the domain, set DNS A record in Cloudflare → server IP, orange-cloud on (CDN for `/_next/static` + `/_next/image`), SSL mode Full (strict).
- Remember the Redeploy-after-domain-change gotcha above.

## 4. Deploy open-source services

Two ways to get a service in:

1. **Service catalog** — `+ New Resource` → search the one-click list. Note: the catalog depends on the Coolify version; if a known service (e.g. Wallos) doesn't appear, update Coolify or use option 2.
2. **Docker Compose** — `+ New Resource` → Docker Compose → paste the project's compose file. Works for anything.

Currently self-hosted this way:

### usesend (email marketing) — mail.alisamadii.com

- Full stack service: app + PostgreSQL + Redis. See [usesend docs](https://github.com/usesend/usesend) for compose.
- Connected to SES us-west-2, sending domain `send.alisamadii.com`.

### Wallos (subscription tracker)

Recurring subscriptions only — one-time expenses don't fit its billing-cycle model. Compose:

```yaml
services:
  wallos:
    image: bellamy/wallos:latest
    environment:
      - TZ=America/New_York
    volumes:
      - wallos_db:/var/www/html/db
      - wallos_logos:/var/www/html/images/uploads/logos
volumes:
  wallos_db:
  wallos_logos:
```

Container listens on port 80; set the domain on the service and Coolify's proxy handles the rest. First visit creates the admin account.

### Money tracker (one-time expenses)

Deployed alongside Wallos. Same compose pattern; back up its data volume or database like everything else (section 5).

## 5. Backups (do this the same day, not later)

Three layers. Code needs nothing — it redeploys from GitHub. Only **data** needs backing up: database contents and app volumes. Env vars and Coolify settings are a fourth thing — see 5d.

### 5a. Hostinger layer (whole-disk)

- VPS → Snapshots & Backups → confirm **weekly backups** are enabled (free tier).
- Take one manual **snapshot** now. Snapshots expire in ~24h — they are a "before I do something risky" tool, not a real backup.
- Don't pay for the daily-backup upsell (~$12/mo); the R2 layer below covers daily data backups for free.

### 5b. Cloudflare R2 destination (offsite)

1. Cloudflare dash → R2 → create bucket `server-backups` (10 GB free tier is plenty; dumps are KB–MB).
2. Create an R2 API token, scope **Object Read & Write** on that bucket. Save Access Key, Secret Key, and the S3 endpoint.
3. Coolify → S3 Storage → New storage:

| Field | Value |
|---|---|
| Name | `r2-backups` |
| Protocol / Port | `https` / `443` |
| Host | `<ACCOUNT_ID>.r2.cloudflarestorage.com` (no `https://`, no bucket in the host) |
| Bucket | `server-backups` |
| Region | `auto` (not us-east-1) |
| Access/Secret key | from the R2 token |

4. **Validate Connection** must pass. If it fails: region isn't `auto`, or token scope is wrong.

### 5c. Per-app backup schedules

Every backup is a **full copy** of the data at that moment — retention N means "keep the N newest full copies", nothing is ever only in an old backup.

**Postgres/MySQL (usesend, anything with a real DB):**

1. Open the database resource → **Backups** → Add backup → **Database backup**.
2. Frequency `0 3 * * *` (daily 3am), timeout default.
3. S3 storage tab → enable → select `r2-backups`.
4. Retention: local `7 / 0 / 0`, S3 `30 / 0 / 0` (backups-to-keep / days / max-GB; 0 = unlimited, first limit reached wins).
5. **Back up now** → check Executions shows success → confirm the `.dmp` file actually appears in the R2 bucket. A backup isn't done until the file is verified offsite.

**SQLite / file-based apps (Wallos, money tracker):**

1. Open the service → **Backups** → Add backup → **Storage backup**.
2. Target: the data volume (e.g. `wallos-db`). Skip cosmetic volumes like logo caches.
3. Frequency daily, S3 → `r2-backups`, same retention, same verify-in-R2 step.

### 5d. Env vars + Coolify config

These live only in Coolify's own database on the VPS — **not** in R2. The Hostinger weekly backup covers them, but keep a deliberate offsite copy of every app's env vars (password manager or local encrypted file) so a total account loss isn't fatal.

## 6. Firewall

Hostinger panel → VPS → Firewall. Add accept rules **before** activating (order protects you from locking yourself out):

| Port | Purpose |
|---|---|
| TCP 22 | SSH |
| TCP 80 | HTTP |
| TCP 443 | HTTPS |
| TCP 8000 | Coolify dashboard (temporary — see below) |
| TCP 6001–6002 | Coolify realtime/terminal websockets |

Everything else: drop. The Hostinger AI agent can create this from a prompt — it proposes the rule list first, confirm, then activate.

Verify immediately after activating: fresh `ssh root@<ip>`, load a site, load Coolify `:8000`. If SSH breaks, deactivate the firewall from the Hostinger panel (panel access is never blocked).

**Later hardening:** give Coolify an instance domain (`coolify.alisamadii.com`, Settings → Instance Domain) and remove the 8000 rule — no more unencrypted dashboard on a raw IP.

## 7. Disaster recovery (VPS destroyed / moving providers)

Data survives in R2; recovery is ~half a day, not one click:

1. New VPS → install Coolify (curl command from section 1).
2. Redeploy all apps from GitHub (sections 3–4) — code was never at risk.
3. Restore data from R2:
   - Postgres: create the DB resource → **Import Backup** → feed it the `.dmp` from R2.
   - SQLite volumes: download from R2, place files into the new volume.
4. Re-enter env vars from the offsite copy (5d).
5. Point Cloudflare DNS A records at the new IP.

Worst-case loss: the hours since the last nightly dump.

Three copies, three places: **git = code, R2 = data, password manager = secrets.** Nothing kills all three at once.

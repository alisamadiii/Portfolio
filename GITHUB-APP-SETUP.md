# GitHub App setup: Ali Samadi App

Copy-paste values for github.com/settings/apps → New GitHub App. Create two apps: production and dev.

## 1. Production app — form values

| Field                                                  | Value                                                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub App name                                        | `Ali Samadi App`                                                                                                                               |
| Description                                            | `Connects your website's repository to the Ali Samadii hub: live previews, AI edits, and publishing. Only accesses the repositories you pick.` |
| Homepage URL                                           | `https://hub.alisamadii.com`                                                                                                                   |
| Redirect URI                                           | leave empty (we never use the OAuth flow)                                                                                                      |
| Allow wildcard matching                                | unchecked                                                                                                                                      |
| Expire user authorization tokens                       | leave as is (unused, no OAuth)                                                                                                                 |
| Request user authorization (OAuth) during installation | **UNCHECKED**                                                                                                                                  |
| Enable Device Flow                                     | unchecked                                                                                                                                      |
| Setup URL (optional)                                   | `https://hub.alisamadii.com/integrations/github/setup`                                                                                         |
| Redirect on update                                     | **CHECKED** (repo add/remove also round-trips through the hub)                                                                                 |
| Webhook: Active                                        | **CHECKED**                                                                                                                                    |
| Webhook URL                                            | `https://api.alisamadii.com/api/webhook/github-app`                                                                                            |
| Webhook Secret                                         | generate: `openssl rand -hex 32` — save it, it becomes `GITHUB_APP_WEBHOOK_SECRET`                                                             |

### Permissions

Open **Repository permissions** and set exactly one:

| Permission    | Level                                                   |
| ------------- | ------------------------------------------------------- |
| Contents      | **Read and write**                                      |
| Pull requests | **Read and write** (Publish opens + squash-merges a PR) |
| Metadata      | Read-only (forced automatically)                        |

Everything else (Organization, Account, Enterprise): No access.

Changing permissions later: owners of existing installations must approve the
new permissions (GitHub emails them; also under Settings → Installations →
Configure). Tokens minted before approval keep the old permission set.

### Subscribe to events

Leave all checkboxes unchecked. `installation` and `installation_repositories` events are always delivered to a GitHub App's webhook — no subscription needed. (They only appear in this list after saving permissions anyway.)

### Where can this GitHub App be installed?

**Any account** — required. Clients and outside creators install it on their own repos; "Only on this account" would break the whole multi-tenant flow.

Click **Create GitHub App**.

## 2. After creating (production)

1. Note the **App ID** (settings page, top) and the **slug** (the URL: `github.com/apps/<slug>` — likely `ali-samadi-app`).
2. **Generate a private key** (bottom of the settings page). It downloads a `.pem`. Base64 it to a single line:
   ```sh
   base64 < ali-samadi-app.*.private-key.pem | tr -d '\n'
   ```
3. Get the **bot user id** (needed for the fallback commit identity):
   ```sh
   curl -s https://api.github.com/users/<slug>%5Bbot%5D | jq .id
   ```

## 3. Environment variables

### Portfolio api (Vercel, apps/api)

```
GITHUB_APP_ID=<App ID>
GITHUB_APP_PRIVATE_KEY=<base64 PEM, single line>
GITHUB_APP_NAME=<slug>
GITHUB_APP_WEBHOOK_SECRET=<webhook secret from step 1>
```

### content-pilot (Coolify)

```
GITHUB_APP_ID=<App ID>
GITHUB_APP_PRIVATE_KEY=<same base64 PEM>
GIT_AUTHOR_NAME=<slug>[bot]
GIT_AUTHOR_EMAIL=<bot user id>+<slug>[bot]@users.noreply.github.com
```

The app credentials are mandatory in both services — ALL GitHub access (reads, commits, pushes, repo listing) runs on installation tokens. `GITHUB_PAT` and `AGENCY_GITHUB_LOGIN` no longer exist; a project whose repo has no installation shows the install overlay until its owner installs the app.

Note: `GIT_AUTHOR_*` is only the fallback identity. Sessions commit as the human who installed the app (their GitHub noreply address), which keeps Netlify-style git-contributor licensing happy.

## 4. Dev app (for local testing)

Same form, these values differ:

| Field             | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| GitHub App name   | `Ali Samadi App Dev`                                                  |
| Homepage URL      | `http://localhost:3007`                                               |
| Setup URL         | `http://localhost:3007/integrations/github/setup`                     |
| Webhook URL       | your smee channel: create at https://smee.io/new                      |
| Where installable | Any account (or Only this account if you only test on your own repos) |

Forward webhooks locally (api app on :3000):

```sh
npx smee -u https://smee.io/<channel> -t http://localhost:3000/api/webhook/github-app
```

Put the dev app's id/key/slug/secret in the local `.env` files of apps/api and content-pilot.

## 5. Verify end to end

1. Install the dev app on a scratch repo (your account).
2. Webhook fires → `github_installation` row appears.
3. GitHub redirects to `/integrations/github/setup` → "GitHub App linked" toast.
4. Hub → Import: the scratch repo is listed from the installation. Import it.
5. Canvas loads (reads ride the installation token — works even with GitHub OAuth disconnected).
6. Start an AI session locally: clone + edit + push succeed; the commit on GitHub shows YOUR avatar (installer identity), not the bot.
7. Uninstall the app → the canvas shows the "Install the GitHub App" overlay; reinstall → it unlocks by itself within ~4s.

## 6. Key rotation (whenever needed)

Generate a new private key in the app settings, swap `GITHUB_APP_PRIVATE_KEY` in both services, redeploy, then delete the old key on GitHub. Cached installation tokens stay valid until expiry — zero downtime.

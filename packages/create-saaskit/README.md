# create-saaskit

Start a production-ready SaaS from the [SaaSKit](https://saaskit.alisamadii.com) templates.

```bash
npx create-saaskit@latest
```

It asks which template you want, then opens GitHub's **"create a repo from a template"** page so
you generate your **own** private repo — no clone, no shared history, no tokens.

The template repos are **private**. Access is granted automatically when you buy SaaSKit and
connect GitHub in your Polar customer portal, so only buyers can generate from them. Everyone else
just sees GitHub's not-found page (plus a buy link from the CLI).

## What it does

1. Pick a template (`full-stack` or `monorepo`) with ↑/↓.
2. Opens `https://github.com/new?template_owner=alisamadiillc-templates&template_name=…`.
3. You name the repo, choose **Private**, and click **Create repository**.
4. Clone your new repo, copy `.env.example` → `.env.local`, install, and run.

## Usage

```bash
npx create-saaskit [options]
```

| Option | Description |
| --- | --- |
| `--template <name>` | Template to use (`full-stack`, `monorepo`). Prompts if omitted |
| `--no-open` | Print the link instead of opening the browser |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Requirements

- Node.js ≥ 18
- A GitHub account with access to the templates (granted on purchase via Polar)

## Prerequisites (maintainers)

- Each template repo must have **Settings → Template repository** enabled.
- The Polar GitHub benefit on each product must grant read access to the matching repo
  (full-stack → `full-stack-nextjs`, monorepo → `monorepo-full-stack`).

## Testing locally

```bash
node packages/create-saaskit/index.js --no-open      # prints the URL, no browser
node packages/create-saaskit/index.js --template monorepo --no-open
node packages/create-saaskit/index.js                # full interactive flow
```

## Publishing

```bash
pnpm --filter create-saaskit publish --access public --no-git-checks
```

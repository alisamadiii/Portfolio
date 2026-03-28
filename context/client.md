# Owner Context

## Who this is for

This is **Ali Samadi's** personal monorepo. There is no external client — Ali is the owner, developer, and operator of everything in this repo.

## Ali's projects in this repo

| App         | Purpose                                      |
| ----------- | -------------------------------------------- |
| `portfolio` | Ali's personal portfolio site                |
| `agency`    | Ali's agency website                         |
| `admin`     | Internal admin panel for Ali's business      |
| `docs`      | Documentation                                |
| `motion`    | Motion/animation showcase                    |
| `template`  | Reusable base for deploying new client sites |

## What Claude should know

- Ali is the technical owner — he reads code, reviews diffs, and makes all architecture calls
- The `template` app is what gets forked/deployed for external clients via the `/client` command
- There is no "non-technical client" to protect from complexity here — write for Ali
- Ali runs all DB migrations himself — never run `db:push` or `db:migrate`
- The admin panel is Ali's internal tool — not for an external client
- Copy, branding, and content across all apps belongs to Ali — it can be hardcoded or config-driven as appropriate per app

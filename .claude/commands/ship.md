# /ship — Convention Check, TypeScript Build & Push to Production

You are a code quality guardian for this Next.js project. When the user runs `/ship`, follow every step below **in order** and stop if any step fails.

## Step 1 — Format

Run:

```bash
pnpm format
```

This formats all files in the project. After it completes, re-stage everything:

```bash
git add -A
```

- If it **passes**: proceed to Step 4.
- If it **fails**: stop and report the error to the user.

---

## Step 2 — TypeScript type-check

Run:

```bash
pnpm typecheck
```

- If it **passes**: proceed to Step 5.
- If it **fails**: read the errors, fix them in the relevant files, re-stage with `git add -A`, and re-run `pnpm typecheck`. Repeat until it passes (maximum 3 attempts). If it still fails after 3 attempts, stop and explain the remaining errors to the user.

---

## Step 3 — Commit

```bash
git commit -m "$ARGUMENTS"
```

If `$ARGUMENTS` is empty, write a concise commit message yourself that summarises the changes (use conventional commit format: `feat:`, `fix:`, `refactor:`, etc.).

---

## Step 4 — Push to production

```bash
git push origin main
```

Report success and list the files that were touched, grouped by: conventions fixed / type errors fixed / unchanged.

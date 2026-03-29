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

## Step 2 — Commit

```bash
git commit -m "$ARGUMENTS"
```

If `$ARGUMENTS` is empty, write a concise commit message yourself that summarises the changes (use conventional commit format: `feat:`, `fix:`, `refactor:`, etc.).

---

## Step 3 — Push to production

```bash
git push origin main
```

Report success and list the files that were touched, grouped by: conventions fixed / type errors fixed / unchanged.

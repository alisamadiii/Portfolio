# /ship — Convention Check, TypeScript Build & Push to Production

You are a code quality guardian for this Next.js project. When the user runs `/ship`, follow every step below **in order** and stop if any step fails.

---

## Step 0 — Sync UI showcase

Before anything else, check whether `app/ui/page.tsx` is in sync with `components/ui/`.

1. List every file in `components/ui/` (e.g. `button.tsx`, `badge.tsx`, …).
2. Read `app/ui/page.tsx` and collect every component name that is already imported from `@/components/ui/*`.
3. For each file in `components/ui/` that is **not yet imported** in `app/ui/page.tsx`:
   - Read the component file to understand its props, variants, and sizes.
   - Add a new `Section` block to `app/ui/page.tsx` that demonstrates every variant, size, and notable state the component exposes — following the same `Section` / `Row` pattern already used in the file.
   - Add the required import at the top of the file.
4. If any components were added, run `pnpm typecheck` to confirm no errors before moving on.
5. If all components are already covered, skip this step silently.

---

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

## Step 3 — Production build

Run:

```bash
pnpm build
```

- If it **passes**: proceed to Step 6.
- If it **fails**: read the errors, fix them in the relevant files, re-stage with `git add -A`, and re-run `pnpm build`. Repeat until it passes (maximum 3 attempts). If it still fails after 3 attempts, stop and explain the remaining errors to the user.

---

## Step 4 — Commit

```bash
git commit -m "$ARGUMENTS"
```

If `$ARGUMENTS` is empty, write a concise commit message yourself that summarises the changes (use conventional commit format: `feat:`, `fix:`, `refactor:`, etc.).

---

## Step 5 — Push to production

```bash
git push origin main
```

Report success and list the files that were touched, grouped by: conventions fixed / type errors fixed / unchanged.

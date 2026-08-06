---
name: blog
description: Write a complete, SEO-optimized blog post for the agency/client site in the client's voice. Use when the user says "write a blog post", "/blog", "new article", "write a post about X", or wants a keyword-targeted post drafted end-to-end. Runs SERP research, matches the top-ranking format and length, answers for the featured snippet, adds an FAQ from People-Also-Ask, fetches Pexels images, and writes a schema-correct post to src/content/blog/.
---

# Blog post writer

Full-auto pipeline. Given a topic or keyword (from the skill args), produce ONE finished,
publish-ready post in `apps/agency/src/content/blog/` — voiced, SEO-matched, illustrated —
then report. Run every phase below in order. Do not skip research. Do not skip images.

The gold-standard reference to imitate is the existing post
`apps/agency/src/content/blog/web-design-process.md` — match its structure, density, and
finish quality.

---

## Phase 0 — Pick the primary keyword

- If the user gave a keyword/topic in the args, that's the primary. If they gave raw info
  or notes, keep them to weave into the draft.
- Read `apps/agency/references/used-keywords.md`. **Never reuse a primary already listed
  there** (keyword cannibalisation). If the requested keyword is already used, tell the user
  and propose a distinct angle.
- Prefer a primary from the client's active keyword research export (CSV) when one is
  available — never invent a primary if a CSV exists. If no keyword/CSV is available, propose
  2-3 strong angles from gaps in `used-keywords.md` and pick the best.
- Build the cluster: 1 primary + 4-5 secondaries (same-intent — someone searching the
  secondary would want the same page). Pull secondaries from the CSV first; invent the rest
  from typical People-Also-Ask / Related-Searches patterns.
- **Add the new keyword's section to `used-keywords.md` BEFORE writing the post** (follow the
  existing table format there: primary, source, "used on page", secondary cluster).

## Phase 1 — Load the voice (mandatory, read all)

Read every file in `apps/agency/references/`, humour first:

- `humour.md` — humour is **mandatory**, not optional. First 50 words must land a dad joke,
  self-aware wink, or parenthetical aside. Roughly one comedic moment every 300-500 words.
- `voice.md` — sentence rhythm, words to use/avoid, formatting rules, and the **AI-tells
  checklist** (stop-immediately list). Obey it literally.
- `opinions.md` — deploy **one** strong opinion in the post; back it with a number or story.
- `stats.md` — use these numbers **verbatim**. Never round, never invent new figures.
- `stories.md` — adapt **at most one** anecdote to the topic. Never fabricate a new story.
- `used-keywords.md` — already read in Phase 0.

This is the client's persona (e.g. "Marco, Plumbing Co"), not a generic house style. Write
as that person, in "I".

## Phase 2 — SERP research

1. `WebSearch` the primary keyword. Identify the **top 3 organic** results (skip ads,
   Reddit/YouTube/PDF unless they genuinely rank).
2. `WebFetch` each of the 3. Extract: format (listicle / guide / tutorial / comparison),
   word count, every H2/H3 in order, their direct answer to the main question, any FAQ.
3. Decide, from the three:
   - **Format** — match the dominant one.
   - **Length** — target within **20%** of the 3-page average word count.
   - **Shared topics** — list every topic all three cover; the post MUST cover them all.
   - **Gaps** — add **1-2 extra topics** they missed (angle from `opinions.md` / `stats.md`).
4. Find **People Also Ask** questions for the keyword (a follow-up `WebSearch` if needed) —
   these become the FAQ.

If a fetch fails, retry once; if still failing, proceed with the two that worked and note it.

## Phase 3 — Write the post

Structure (this is the winning shape — keep it):

1. **Opener** — funny + direct. Dad joke / wink in the first 50 words. No brochure energy.
2. **TL;DR callout** — a `>` blockquote with the one-paragraph answer.
3. **Featured-snippet answer** — directly answer the main question up top, above the first
   H2: a concise definition (~40-55 words) plus a short list of the steps/points. This is
   what wins position zero.
4. **Body** — cover every shared topic + the 1-2 extras. **Statement headings, not labels**
   (`## Step 2: Strategy — deciding the shape before it's expensive to change`, not
   `## Strategy`). Real numbers over adjectives.
5. **One strong opinion** + a **"when you should NOT hire us"** moment — the single biggest
   voice tell. Talk the wrong-fit reader out of it.
6. **Sign-off** that makes the reader smile (see `humour.md` examples). Never restate the
   opener.
7. **FAQ section** ("Straight answers" or similar) — answer the People-Also-Ask questions,
   including the main-question answer restated tightly.

Enforce the `voice.md` anti-AI-tells list before finalizing: no "comprehensive", no
exclamation marks, no emojis, no `-ing` triple lists, no "Whether you're X, Y, or Z", no
closing that restates the opening, not every bullet a full sentence ending in a period.

**Frontmatter** — must validate against the zod schema in `apps/agency/src/content.config.ts`:

```yaml
---
title: "..." # required — compelling, keyword near the front
description: "..." # required — meta description, ~150-160 chars, keyword included
keyword: "..." # required — the exact primary keyword
publishDate: YYYY-MM-DD # required — today's date
heroImage: "/blog/<slug>-hero.webp" # required — matches a QUERIES key (Phase 4)
heroImageAlt: "..." # required
heroCredit: # optional — fill from blog-image-credits.json after Phase 4
  name: "..."
  url: "..."
  pexelsUrl: "..."
tags: ["...", "..."] # optional
# draft / updatedDate are optional
---
```

File path: `apps/agency/src/content/blog/<slug>.md` where `<slug>` = kebab-case of the primary
keyword.

## Phase 4 — Images (always)

Every H2 gets an image above it, plus the hero.

1. Choose a short `key` per image (e.g. `<slug>-hero`, and one per H2). Reuse an existing
   generic key from the `QUERIES` map (`discovery`, `strategy`, `execution`, `launch`,
   `timeline`, …) when its query genuinely fits, to avoid re-downloading.
2. Add each new `key → Pexels search query` to the `QUERIES` map in
   `apps/agency/scripts/fetch-blog-images.mjs`. Queries should be concrete and photographic.
3. From `apps/agency`, run: `pnpm blog:images`. It writes `public/blog/<key>.webp` and
   `src/data/blog-image-credits.json`.
4. In the post, reference `![alt text](/blog/<key>.webp)` on the line **above** each H2.
   Set `heroCredit` in frontmatter from the hero key's entry in `blog-image-credits.json`.
5. Add an **"Image credits"** footer at the end linking every photographer (name → their
   Pexels `url`) and Pexels. Copy the format from `web-design-process.md`.

## Phase 5 — Finalize

- Update the new section in `used-keywords.md`: set "Used on page" to the new slug.
- Report to the user:
  - primary keyword + secondaries
  - format matched and the top-3 average word count vs the draft's word count
  - shared topics covered + the 1-2 extras added
  - images fetched (keys + photographers)
- Offer to preview via the dev server. Do not commit or deploy unless asked.

## Quality bar

Before declaring done, reread the post as the client (e.g. Marco at the pub, one beer in).
If it reads like a brochure, a LinkedIn post, or an AI trying to be funny — fix it. It should
sound like a real person who knows the trade and can't resist a bad pun, while still ranking.

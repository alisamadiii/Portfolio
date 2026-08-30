# Instagram Carousel Design System

Derived from reference: "Premium fonts" gorilla slide (grafikcem style).
Applies to every carousel slide and story frame for **Ali Samadii LLC**.

Live spec + template: [design-system.html](design-system.html)

---

## 1. Canvas

| Format | Size | Ratio |
|---|---|---|
| Carousel slide | 1080 × 1350 px | 4:5 |
| Story / Reel cover | 1080 × 1920 px | 9:16 |

- Safe margin: **64px** on all sides. Nothing text touches outside it.
- Bottom 180px of stories reserved (UI overlap).

## 2. Color

One hue family per carousel. Everything lives inside that hue except the subject.

**Default theme = Agency Orange** — from agency site brand (`--color-accent: #fc8464`).

| Token | Value (agency orange — default) | Role |
|---|---|---|
| `--bg` | `#8A3113` | Background base (center) |
| `--bg-deep` | `#521A08` | Vignette edge |
| `--ink` | `#FFFFFF` | All text |
| `--ink-dim` | `rgba(255,255,255,0.78)` | Secondary text (email, counter) |
| `--accent` | `#FC8464` | The single colored prop on the subject |
| `--cta-fg` | `#0A0A0A` | Arrow inside CTA circle |

**Background is never flat.** Radial gradient: `--bg` at center-top → `--bg-deep` at edges (soft vignette, subject pops).

**Theme swap rule:** to re-theme a carousel, rotate hue only — keep lightness/saturation relationships identical. Approved alternates (use sparingly — orange is the feed identity):
- Reference Red: bg `#7C1017` / deep `#4E070D` / accent `#E02B36`
- Ink: bg `#1A1A1E` / deep `#0B0B0D` / accent `#FC8464` (brand orange prop on near-black)
- Royal: bg `#1A2A7C` / deep `#0D1547` / accent `#3B5BFF`

One theme per carousel — never mix hues across slides of same post.

## 3. Typography

Two voices, always paired, always white.

| Token | Font | Style | Size (1080w) | Tracking |
|---|---|---|---|---|
| Display Sans | Inter / Helvetica Now | 700–800 | 170–200px | -0.035em |
| Display Serif | Playfair Display (or Didot) | 500 *italic* | 0.75× of sans | -0.01em |
| Meta label | Inter | 700 | 26px | 0 |
| Meta text | Inter | 400 | 26px | 0 |
| Counter | Inter | 500 | 28px | 0 |
| Wordmark | Sans 700 + Serif italic hybrid | — | 34px | sans part -0.02em |

**Headline lockup rule:** sans word on top, serif italic word overlapping it below. Serif baseline sits ~0.55em into the sans line (negative margin overlap). Serif is the *emotional* word, sans is the *functional* word. Max 2 words per voice.

Line-height on display type: 0.9.

## 4. Slide Anatomy (top → bottom)

```
┌─────────────────────────────┐
│ Get in touch          1/7   │  ← meta row, 64px from top
│ a@alisamadii.com            │
│                             │
│        [ SUBJECT ]          │  ← centered, ~65–75% of height,
│        monochrome +         │    bleeds behind headline
│        one accent prop      │
│                             │
│      HEADLINE SANS          │  ← lockup starts ~58% down
│         serif italic        │    overlaps subject, z-index above
│                             │
│            (→)              │  ← CTA circle 76px, white
│                             │
│        wordmark             │  ← centered, 56px from bottom
└─────────────────────────────┘
```

Fixed furniture on **every** slide:
- Top-left: `Get in touch` (bold) + `a@alisamadii.com` (regular), stacked.
- Top-right: counter `n/total`.
- Bottom-center: wordmark `alisamadii` — "alisamadi" in bold sans + "llc" in serif italic (mirrors grafik*cem* pattern).
- CTA circle: only on slides that continue (arrow →) — last slide swaps arrow for CTA text or DM prompt.

## 5. Art Direction — Subject

This is what makes the style. Non-negotiable:

1. **Monochrome subject.** Photo/render fully desaturated (B&W), high contrast, dramatic side light.
2. **One accent prop** on the subject (headphones, glasses, phone case…) colored in the theme hue — slightly brighter than bg (`--accent`).
3. Subject looks **up or off-frame**, never at camera. Aspirational posture.
4. Subject clothing may be deep theme-hue (like the hoodie) — sits between subject and bg tonally.
5. Subject bleeds behind headline; headline z-index on top. Text always legible — subject darkest zone behind text, or add subtle bottom vignette.
6. No drop shadows, no outlines, no gradient text, no 3D text effects.

Image generation prompt skeleton (Higgsfield/other):
> "monochrome black-and-white [subject], wearing [prop] in warm coral orange, deep burnt-orange studio background, dramatic rim lighting, looking upward, editorial photography, 4:5"

(Swap the two color words when using an alternate theme.)

## 6. Slide Types

| Type | Use | Differences |
|---|---|---|
| **Hook (1/n)** | Scroll-stopper | Full anatomy above. Biggest type. Curiosity headline. |
| **Content (2..n-1)** | Value | Same furniture; headline smaller (96–118px), body text allowed: Inter 400, 40px, line-height 1.45, max 34ch, `--ink-dim`, bold spans in `--ink` |
| **CTA (n/n)** | Convert | Headline = command ("Let's build yours"). CTA circle → pill button w/ text ("DM 'SITE'" / "alisamadii.com"). |

### 6a. Hook cover variations

Four interchangeable covers (all in design-system.html). Rotate them so the feed doesn't repeat. Furniture never changes.

| Variant | Look | When |
|---|---|---|
| **A — Subject** | Centered monochrome subject + accent prop, giant center lockup | Brand/identity posts, big statements |
| **B — Editorial badge** | Grain texture, rotated dark badge chip, left-aligned two-tone sans headline (white + `--accent` — never dark-on-dark, fails contrast), rich body with bold spans, taped media card | Offers, announcements, "system" posts |
| **C — Paper serif** | Light paper bg `#EFE9DE`, orange caps kicker, italic serif two-tone headline (black + `#C2451F`), taped screenshot/mockup | Educational, myth-busting, "know your enemy" posts |
| **D — Sticker** | One giant word + `?`, cutout subject slot, white sticker pills (4px black border, alternating rotation) | Service-menu, question hooks, playful posts |

### 6b. Content slide templates

| Template | Base | Blocks |
|---|---|---|
| **Dark card** | Variant B styling | badge → two-tone headline (96px) → rich body → taped proof image (chart, screenshot, pricing card) |
| **Paper list** | Variant C styling | kicker → serif headline → numbered rows `01 · WORD — description` (3px top rule, 2px row rules) → optional taped image |

Shared variant rules:
- **Grain** on B/C/D-style slides: SVG fractal noise overlay at 16% opacity (riso print feel). Variant A stays clean.
- **Taped media cards**: rotate -1.5°, two translucent tape strips (top-left, bottom-right) at -35°, 20px radius.
- Paper theme flips tokens locally: ink `#17130F`, orange text uses `#C2451F` (WCAG-safe on cream), CTA circle goes dark with cream arrow.
- "SWIPE →" bottom-right in monospace 28px on every non-final slide.

**Tweaking in design-system.html:** every image slot is click-to-upload (dashed border until filled), every text block is contenteditable — edit inline, then screenshot at 1080×1350. Changes are not saved on refresh.

## 7. Carousel Arc (default narrative)

Default 5-slide story structure: **HOOK → PAIN → STEPS → RESULT → JOIN**.

> **Reference, not law.** If the post's content fits a different arc better (case study, listicle, before/after, announcement, myth-busting), the AI is allowed to skip this and design its own arc. Keep only two invariants: slide 1 is always a scroll-stopping hook, last slide is always a CTA.

| # | Slide | Job | Content rules |
|---|---|---|---|
| 01 | **HOOK** (cover) | Grab attention | One hero word; subline = pain + payoff |
| 02 | **PAIN** (problem) | Name the pain | Name the problem directly; ✗-list of what breaks |
| 03 | **STEPS** (system) | Show the system | The mechanism that solves it; 01/02/03 numbered list |
| 04 | **RESULT** (proof) | Prove it works | Massive specific number; ✓-checkmark outcomes |
| 05 | **JOIN** (cta) | Drive the action | Price + lock-in promise; comment keyword (e.g. "comment SITE") |

Arc can stretch past 5 slides — PAIN and STEPS may each span 2–3 slides; HOOK and JOIN stay single.

## 8. Voice / Copy Rules

- Hook headline: 2–4 words. Sans word = noun/benefit, serif word = twist ("Premium *fonts*", "Real *results*", "Zero *templates*").
- No hashtags on the image. Hashtags live in caption.
- Email + wordmark identical on every slide — brand consistency = feed cohesion.

## 9. Export

- PNG, sRGB, 1080×1350, no compression artifacts (screenshot at 1× from 1080px canvas).
- File naming: `YYYY-MM-DD-topic-slug/slide-01.png … slide-NN.png`
- All publishable content lives under `social-media/content/` (see its README):
  - Posts: `content/posts/YYYY-MM-DD-slug/` — `slides.html` (editable source) + exported PNGs + `caption.md`.
  - Stories: `content/stories/YYYY-MM-DD-slug/` — same pattern at 1080×1920.

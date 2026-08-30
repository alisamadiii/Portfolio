# Content

All publishable Instagram content lives here.

```
content/
  posts/
    YYYY-MM-DD-topic-slug/
      slides.html    ← editable source (open in browser, tweak text/images inline)
      slide-01.png … ← exported 1080×1350 slides, ready to upload
      caption.md     ← IG caption + hashtags + posting notes
  stories/
    YYYY-MM-DD-topic-slug/   ← same pattern, 1080×1920
```

Rules:

- One folder per post, date-prefixed, kebab-case slug.
- PNGs are the deliverable — re-export after any `slides.html` tweak.
- Design tokens/rules: [../DESIGN.md](../DESIGN.md) + [../design-system.html](../design-system.html).

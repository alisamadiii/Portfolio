## Development

When starting the dev server, use background mode:

```
astro dev
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Pages CMS (`.pages.yml`)

This site is edited through the Pages CMS, driven by `.pages.yml`. The CMS renders
special UI for certain conventions (typed link/email/tel inputs, a live SEO
preview, …).

- **Before editing `.pages.yml`, read [docs/pages-cms.md](docs/pages-cms.md)** for
  the exact field shapes.
- When a new CMS feature/skill is added, **update `docs/pages-cms.md`** so this
  guidance stays in sync.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

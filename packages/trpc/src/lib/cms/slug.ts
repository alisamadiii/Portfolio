// URL slug from a post title: lowercase, diacritics stripped (NFKD), anything
// non-alphanumeric collapsed to single dashes, dashes trimmed. Dependency-free
// on purpose — cms-core's `slugify` package serves file naming, not URLs.
export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

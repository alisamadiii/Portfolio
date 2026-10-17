/**
 * Client-friendly names for the files an AI session touches. The chat and the
 * Changes dialog talk to site owners, not developers: "Hero component" reads
 * better than "src/components/Hero.astro". The raw path is still shown
 * alongside for anyone who wants it.
 */
export const friendlyFileLabel = (path: string): string => {
  const rel = path.replace(/^\.?\/?src\//, "").replace(/^\.?\//, "");
  const file = rel.split("/").pop() ?? rel;
  const stem = file.replace(/\.[^.]+$/, "");
  const words = stem
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  if (rel === "_site.json") return "Site settings";
  if (rel === "_pages.json") return "Page content";
  if (rel.startsWith("_collections/")) return `${titleCase(words)} entries`;
  if (/^styles\//.test(rel) || /\.css$/.test(rel)) return "Site styles";
  if (/^components\//.test(rel)) return `${titleCase(words)} component`;
  if (/^layouts\//.test(rel)) return `${titleCase(words)} layout`;
  if (/^pages\//.test(rel)) {
    const page = rel.replace(/^pages\//, "").replace(/\.[^.]+$/, "");
    return page === "index" ? "Home page" : `${titleCase(page.replace(/[-_/]+/g, " "))} page`;
  }
  if (/^content\//.test(rel) || /\.mdx?$/.test(rel)) return `${titleCase(words)} (content)`;
  if (/^public\//.test(rel)) return `${file} (asset)`;
  return titleCase(words) || file;
};

const titleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

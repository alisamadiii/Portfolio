// ─── Inspirations (shared, browser-safe) ─────────────────────────
// Ali's design inspiration board: images in the media bucket (R2_BUCKET,
// public via the CDN) under inspiration/, one folder tree:
//   inspiration/01-hero-sections/.keep                 a folder (empty ones too)
//   inspiration/01-hero-sections/02-pest-control/<ms>-<rand>.webp
//   inspiration/_prompts.json                          saved prompts
// Folders sort by their number; images newest first by the ms in the name.
// Server side: lib/inspiration.ts. Admin hub page: /inspirations.

export const INSPIRATION_PREFIX = "inspiration/";
export const FOLDER_MARKER = ".keep";
export const PROMPTS_KEY = `${INSPIRATION_PREFIX}_prompts.json`;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const IMAGE_EXTS = new Set(["svg", "png", "jpg", "jpeg", "webp", "gif", "avif"]);

/** One folder segment: "<number>-<slug>", e.g. "01-hero-sections". */
export const isFolderSegment = (seg: string) => /^\d+-[a-z0-9][a-z0-9-]{0,79}$/.test(seg);

/** A folder path: segments joined by "/" (no prefix). */
export const isFolderPath = (path: string) =>
  path.length > 0 && path.split("/").every(isFolderSegment);

/** An image file name inside a folder: "<ms>-<rand>.<ext>". */
export const isImageName = (name: string) => {
  const m = /^(\d+)-[a-z0-9]+\.([a-z0-9]+)$/.exec(name);
  return !!m && IMAGE_EXTS.has(m[2]!);
};

const ACRONYMS: Record<string, string> = {
  faq: "FAQ",
  hvac: "HVAC",
  cta: "CTA",
  ui: "UI",
  ux: "UX",
  saas: "SaaS",
  seo: "SEO",
  ai: "AI",
  cms: "CMS",
  api: "API",
  "3d": "3D",
};
const SMALL_WORDS = new Set(["and", "or", "to", "of", "in", "for", "the", "a", "on", "with"]);

/** "07-login-and-signup" -> "Login & Signup", "12-faq" -> "FAQ". */
export const humanize = (segment: string) =>
  segment
    .replace(/^\d+-/, "")
    .split("-")
    .map((w, i) => {
      if (ACRONYMS[w]) return ACRONYMS[w];
      if (i && SMALL_WORDS.has(w)) return w === "and" ? "&" : w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

/** "Login & Signup" -> "login-and-signup". */
export const slugify = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Next "<NN>-<slug>" among sibling folder segments (new folders go last). */
export const nextFolderName = (siblings: string[], title: string) => {
  const slug = slugify(title) || "folder";
  const top = siblings.reduce((max, s) => Math.max(max, Number.parseInt(s, 10) || 0), 0);
  const width = Math.max(2, String(top + 1).length);
  return `${String(top + 1).padStart(width, "0")}-${slug}`;
};

/** Object key for a new image: newest-first order comes from `now`. */
export const imageKey = (folderPath: string, ext: string, now = Date.now()) =>
  `${INSPIRATION_PREFIX}${folderPath}/${now}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

export type InspirationImage = { key: string; url: string; addedAt: number };

export type InspirationFolder = {
  /** last segment, e.g. "02-pest-control" */
  name: string;
  /** "01-hero-sections/02-pest-control" */
  path: string;
  title: string;
  images: InspirationImage[];
  children: InspirationFolder[];
};

export type InspirationPrompt = { id: string; title: string; body: string };

/**
 * Bucket listing -> folder tree. Keys outside the prefix, `_prompts.json`,
 * markers and unknown files never show as images; a folder exists when any
 * key (its marker included) sits inside it.
 */
export function buildTree(objects: { key: string; url: string }[]): InspirationFolder[] {
  const root: InspirationFolder = { name: "", path: "", title: "", images: [], children: [] };
  const byPath = new Map<string, InspirationFolder>([["", root]]);

  const folderFor = (segments: string[]) => {
    let parent = root;
    for (let i = 0; i < segments.length; i++) {
      const path = segments.slice(0, i + 1).join("/");
      let folder = byPath.get(path);
      if (!folder) {
        folder = { name: segments[i]!, path, title: humanize(segments[i]!), images: [], children: [] };
        byPath.set(path, folder);
        parent.children.push(folder);
      }
      parent = folder;
    }
    return parent;
  };

  for (const { key, url } of objects) {
    if (!key.startsWith(INSPIRATION_PREFIX)) continue;
    const parts = key.slice(INSPIRATION_PREFIX.length).split("/");
    const file = parts.pop()!;
    if (!parts.length || !parts.every(isFolderSegment)) continue;
    const folder = folderFor(parts);
    if (isImageName(file)) {
      folder.images.push({ key, url, addedAt: Number.parseInt(file, 10) });
    }
  }

  const sort = (folder: InspirationFolder) => {
    folder.children.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    folder.images.sort((a, b) => b.addedAt - a.addedAt || b.key.localeCompare(a.key));
    folder.children.forEach(sort);
  };
  sort(root);
  return root.children;
}

/** Every image in a folder and its subfolders. */
export const countImages = (folder: InspirationFolder): number =>
  folder.images.length + folder.children.reduce((n, c) => n + countImages(c), 0);

/** Every folder, depth first. */
export const flattenFolders = (folders: InspirationFolder[]): InspirationFolder[] =>
  folders.flatMap((f) => [f, ...flattenFolders(f.children)]);

/** Up to `n` cover images from a folder, then its subfolders. */
export const coverImages = (folder: InspirationFolder, n = 3): InspirationImage[] => {
  const out = folder.images.slice(0, n);
  for (const child of folder.children) {
    if (out.length >= n) break;
    out.push(...coverImages(child, n - out.length));
  }
  return out;
};

/** Prompt id from its title, unique among `taken` ("my-prompt", "my-prompt-2"). */
export const promptId = (title: string, taken: string[]) => {
  const base = slugify(title) || "prompt";
  let id = base;
  for (let i = 2; taken.includes(id); i++) id = `${base}-${i}`;
  return id;
};

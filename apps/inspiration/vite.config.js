import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  mkdirSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  createReadStream,
  readdirSync,
  statSync,
  rmSync,
  readFileSync,
  renameSync,
} from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "public/inspiration");
const PROMPTS_DIR = resolve(__dirname, "prompts");
const VIRTUAL_ID = "virtual:inspiration";

// seeded only when the library has no folders yet, so deleted ones stay deleted
const DEFAULT_FOLDERS = [
  "Hero Sections",
  "Landing Pages",
  "Navigation",
  "Footers",
  "Buttons",
  "Cards",
  "Bento Grids",
  "Features",
  "Pricing",
  "Testimonials",
  "Call to Action",
  "FAQ",
  "Forms",
  "Login & Signup",
  "Onboarding",
  "Dashboards",
  "Sidebars",
  "Tables",
  "Charts",
  "Modals",
  "Tabs",
  "Toasts & Notifications",
  "Empty States",
  "Loaders",
  "Search",
  "Settings",
  "404 Pages",
  "Blog",
  "Portfolio",
  "About & Team",
  "Contact",
  "Product Pages",
  "Checkout",
  "Email Templates",
  "Mobile Apps",
  "Typography",
  "Color Palettes",
  "Gradients",
  "Icons",
  "Illustrations",
  "Logos",
  "Animations",
  "Local Business",
];

const MIME_EXT = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const EXT_MIME = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// safe image filename only: [<order>_]<timestamp>-<rand>.<ext>, no path traversal
function safeName(name) {
  return /^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name || "") ? name : null;
}

// on-disk folder: "<order>-<slug>", e.g. "01-hero-sections"
function safeFolder(dir) {
  return /^\d+-[a-z0-9][a-z0-9-]{0,79}$/.test(dir || "") ? dir : null;
}

const ACRONYMS = { faq: "FAQ", hvac: "HVAC", cta: "CTA", ui: "UI", ux: "UX", saas: "SaaS", seo: "SEO", ai: "AI", cms: "CMS", api: "API", "3d": "3D" };
const SMALL_WORDS = new Set(["and", "or", "to", "of", "in", "for", "the", "a", "on", "with"]);

// "login-and-signup" → "Login & Signup", "faq" → "FAQ"
function humanize(slug) {
  return slug
    .split("-")
    .map((w, i) => {
      if (ACRONYMS[w]) return ACRONYMS[w];
      if (i && SMALL_WORDS.has(w)) return w === "and" ? "&" : w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function isImage(name) {
  return safeName(name) && EXT_MIME[name.split(".").pop().toLowerCase()];
}

// order lives in the filenames so Finder shows the same order as the app:
// folders "01-hero-sections", images "001_1791996904624-e24nww.webp".
// also reads the old "01. Hero Sections" format so it migrates on start
const FOLDER_PREFIX = /^(\d+)(?:\. |-)(.+)$/;
const IMAGE_PREFIX = /^(\d+)_/;

function pad(i, total, min) {
  return String(i + 1).padStart(Math.max(min, String(total).length), "0");
}

// subfolders of an absolute dir, in display order. Any visible folder counts
// (even "My Stuff" made in Finder); adopt() renames it to canonical form
function folderEntries(parent) {
  const seen = new Set();
  return readdirSync(parent)
    .filter((dir) => !dir.startsWith(".") && statSync(join(parent, dir)).isDirectory())
    .map((dir) => {
      const m = FOLDER_PREFIX.exec(dir);
      return { dir, slug: slugify(m ? m[2] : dir), order: m ? Number(m[1]) : Infinity };
    })
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((e) => {
      // "My Stuff" and "my-stuff" side by side would collide on rename
      let slug = e.slug;
      for (let i = 2; seen.has(slug); i++) slug = `${e.slug}-${i}`;
      seen.add(slug);
      return { ...e, slug, name: humanize(slug) };
    });
}

function imageEntries(dir) {
  return readdirSync(dir)
    .filter(isImage)
    .map((file) => {
      const m = IMAGE_PREFIX.exec(file);
      return {
        file,
        base: file.replace(IMAGE_PREFIX, ""),
        order: m ? Number(m[1]) : Infinity,
        t: statSync(join(dir, file)).mtimeMs,
      };
    })
    .sort((a, b) => a.order - b.order || b.t - a.t);
}

// rename subfolders of `parent` to match `listed` order (slugs)
function applyFolderOrder(parent, listed) {
  const entries = folderEntries(parent);
  // unlisted folders keep their relative order after the listed ones
  const slugs = [...listed, ...entries.map((e) => e.slug).filter((n) => !listed.includes(n))];
  slugs.forEach((slug, i) => {
    const entry = entries.find((e) => e.slug === slug);
    if (!entry) return;
    const target = `${pad(i, slugs.length, 2)}-${slug}`;
    if (target !== entry.dir) renameSync(join(parent, entry.dir), join(parent, target));
  });
}

// rename images to match `listed` order (filenames without prefix)
function applyImageOrder(dir, listed) {
  const entries = imageEntries(dir);
  const bases = [...listed, ...entries.map((e) => e.base).filter((b) => !listed.includes(b))];
  bases.forEach((base, i) => {
    const entry = entries.find((e) => e.base === base);
    if (!entry) return;
    const target = `${pad(i, bases.length, 3)}_${base}`;
    if (target !== entry.file) renameSync(join(dir, entry.file), join(dir, target));
  });
}

// adopt folders/images added by hand in Finder (no prefix yet), all the way down
function adopt(parent) {
  const entries = folderEntries(parent);
  if (entries.some((e) => e.dir !== safeFolder(e.dir) || e.order === Infinity)) {
    applyFolderOrder(parent, entries.map((e) => e.slug));
  }
  for (const e of folderEntries(parent)) {
    const dir = join(parent, e.dir);
    const images = imageEntries(dir);
    if (images.some((i) => i.order === Infinity)) applyImageOrder(dir, images.map((i) => i.base));
    adopt(dir);
  }
}

function ensureLibrary() {
  mkdirSync(ROOT_DIR, { recursive: true });
  // seeded only when the library has no folders yet, so deleted ones stay deleted
  if (!folderEntries(ROOT_DIR).length) {
    DEFAULT_FOLDERS.forEach((name, i) => {
      const dir = join(ROOT_DIR, `${pad(i, DEFAULT_FOLDERS.length, 2)}-${slugify(name)}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, ".gitkeep"), "");
    });
  }
  adopt(ROOT_DIR);
}

// tree node: path = slugs ("hero-sections/pest-control"),
// dirPath = on-disk names ("01-hero-sections/01-pest-control")
function listTree(parent, path = "", dirPath = "") {
  return folderEntries(parent).map(({ dir, slug, name }) => {
    const abs = join(parent, dir);
    const node = {
      name,
      path: path ? `${path}/${slug}` : slug,
      dirPath: dirPath ? `${dirPath}/${dir}` : dir,
      files: imageEntries(abs).map((i) => i.file),
    };
    node.children = listTree(abs, node.path, node.dirPath);
    return node;
  });
}

function listLibrary() {
  ensureLibrary();
  return listTree(ROOT_DIR);
}

// slug path ("hero-sections/pest-control", "" = root) → absolute dir
function folderDir(path) {
  let dir = ROOT_DIR;
  for (const segment of (path || "").split("/").filter(Boolean)) {
    const entry = folderEntries(dir).find((e) => e.slug === segment);
    if (!entry) throw new Error(`folder not found: ${segment}`);
    dir = join(dir, entry.dir);
  }
  return dir;
}

// new images go first
function saveImage(folder, buffer, mime) {
  if (!folder) throw new Error("open a folder first");
  const dir = folderDir(folder);
  const ext = MIME_EXT[mime.split(";")[0].trim()];
  if (!ext) throw new Error(`unsupported type: ${mime || "unknown"}`);
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  writeFileSync(join(dir, base), buffer);
  applyImageOrder(dir, [base, ...imageEntries(dir).map((i) => i.base).filter((b) => b !== base)]);
}

// prompt = one .md file: `title:` frontmatter + body. id = filename without .md
function safePromptId(id) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(id || "") ? id : null;
}

function slugify(title) {
  return (
    title
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "prompt"
  );
}

function parsePrompt(id, raw) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  const title = match && /^title:\s*(.*)$/m.exec(match[1]);
  return {
    id,
    title: title ? JSON.parse(title[1]) : id,
    body: (match ? match[2] : raw).trim(),
  };
}

function writePrompt(id, title, body) {
  mkdirSync(PROMPTS_DIR, { recursive: true });
  // JSON string = valid YAML string, survives quotes and colons in titles
  const raw = `---\ntitle: ${JSON.stringify(title)}\n---\n\n${body.trim()}\n`;
  writeFileSync(join(PROMPTS_DIR, `${id}.md`), raw);
}

// newest first
function listPrompts() {
  mkdirSync(PROMPTS_DIR, { recursive: true });
  return readdirSync(PROMPTS_DIR)
    .filter((f) => f.endsWith(".md") && safePromptId(f.slice(0, -3)))
    .map((f) => ({ f, t: statSync(join(PROMPTS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .map(({ f }) => parsePrompt(f.slice(0, -3), readFileSync(join(PROMPTS_DIR, f), "utf8")));
}

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function inspirationApi() {
  return {
    name: "inspiration-api",

    // library baked into the bundle, so the built index.html works from file://
    resolveId(id) {
      if (id === VIRTUAL_ID) return "\0" + VIRTUAL_ID;
    },
    load(id) {
      if (id === "\0" + VIRTUAL_ID) {
        const data = { folders: listLibrary(), prompts: listPrompts() };
        return `export default ${JSON.stringify(data)};`;
      }
    },

    configureServer(server) {
      ensureLibrary();

      // serve saved images ourselves — Vite's publicDir fallback returns
      // index.html (text/html) for runtime-written files, breaking <img>
      server.middlewares.use("/inspiration", (req, res, next) => {
        const segments = req.url.split("?")[0].replace(/^\//, "").split("/").map(decodeURIComponent);
        const name = segments.pop();
        if (!segments.length || !segments.every(safeFolder) || !isImage(name)) return next();
        const file = join(ROOT_DIR, ...segments, name);
        if (!existsSync(file)) return next();
        const ext = name.split(".").pop().toLowerCase();
        res.setHeader("Content-Type", EXT_MIME[ext]);
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(file).pipe(res);
      });

      server.middlewares.use("/api/folders", async (req, res) => {
        try {
          const url = new URL(req.url, "http://x");
          if (req.method === "GET") return json(res, { folders: listLibrary() });

          // POST ?parent=<path>&name=<new>: new folders go first. DELETE ?path=<path>
          if (req.method === "POST") {
            const input = url.searchParams.get("name") || "";
            if (!/[a-z0-9]/i.test(input)) throw new Error("bad folder name");
            const slug = slugify(input);
            const parent = folderDir(url.searchParams.get("parent"));
            const slugs = folderEntries(parent).map((e) => e.slug);
            if (slugs.includes(slug)) throw new Error("folder already exists");
            const dir = join(parent, `00-${slug}`);
            mkdirSync(dir);
            writeFileSync(join(dir, ".gitkeep"), "");
            applyFolderOrder(parent, [slug, ...slugs]);
            return json(res, { slug });
          }
          if (req.method === "DELETE") {
            const path = url.searchParams.get("path");
            if (!path) throw new Error("bad folder path");
            const dir = folderDir(path);
            rmSync(dir, { recursive: true, force: true });
            const parent = dirname(dir);
            applyFolderOrder(parent, folderEntries(parent).map((e) => e.slug));
            return json(res, { ok: true });
          }
          res.statusCode = 405;
          res.end();
        } catch (e) {
          json(res, { error: String(e.message || e) }, 400);
        }
      });

      // drag-and-drop reorder inside one folder (path "" = top level):
      // { path, names } = its subfolders, { path, files } = its images
      server.middlewares.use("/api/order", async (req, res) => {
        try {
          if (req.method !== "PUT") {
            res.statusCode = 405;
            return res.end();
          }
          const { path, names, files } = JSON.parse((await readBody(req)).toString());
          const dir = folderDir(path);
          if (files) {
            applyImageOrder(dir, files.map((f) => f.replace(IMAGE_PREFIX, "")));
          } else {
            applyFolderOrder(dir, names);
          }
          return json(res, { folders: listLibrary() });
        } catch (e) {
          json(res, { error: String(e.message || e) }, 400);
        }
      });

      server.middlewares.use("/api/prompts", async (req, res) => {
        try {
          const url = new URL(req.url, "http://x");
          if (req.method === "GET") return json(res, { prompts: listPrompts() });

          if (req.method === "POST" || req.method === "PUT") {
            const { title, body } = JSON.parse((await readBody(req)).toString());
            if (!title?.trim() || !body?.trim()) throw new Error("title and prompt required");
            let id;
            if (req.method === "PUT") {
              id = safePromptId(url.searchParams.get("id"));
              if (!id || !existsSync(join(PROMPTS_DIR, `${id}.md`))) throw new Error("prompt not found");
            } else {
              const base = slugify(title);
              id = base;
              for (let i = 2; existsSync(join(PROMPTS_DIR, `${id}.md`)); i++) id = `${base}-${i}`;
            }
            writePrompt(id, title.trim(), body);
            return json(res, { prompt: parsePrompt(id, readFileSync(join(PROMPTS_DIR, `${id}.md`), "utf8")) });
          }

          if (req.method === "DELETE") {
            const id = safePromptId(url.searchParams.get("id"));
            if (!id) throw new Error("bad prompt id");
            const file = join(PROMPTS_DIR, `${id}.md`);
            if (existsSync(file)) unlinkSync(file);
            return json(res, { ok: true });
          }

          res.statusCode = 405;
          res.end();
        } catch (e) {
          json(res, { error: String(e.message || e) }, 400);
        }
      });

      server.middlewares.use("/api/images", async (req, res) => {
        try {
          const url = new URL(req.url, "http://x");
          const folder = url.searchParams.get("folder");

          if (req.method === "POST") {
            // pasted HTML with only an <img src> — fetch it server-side (no CORS)
            const remote = url.searchParams.get("url");
            if (remote) {
              const r = await fetch(remote, { headers: { "User-Agent": "Mozilla/5.0" } });
              if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
              saveImage(folder, Buffer.from(await r.arrayBuffer()), r.headers.get("content-type") || "");
              return json(res, { ok: true });
            }
            saveImage(folder, await readBody(req), req.headers["content-type"] || "");
            return json(res, { ok: true });
          }

          if (req.method === "DELETE") {
            const name = url.searchParams.get("name");
            if (!isImage(name)) throw new Error("bad image name");
            const dir = folderDir(folder);
            if (existsSync(join(dir, name))) unlinkSync(join(dir, name));
            applyImageOrder(dir, imageEntries(dir).map((i) => i.base));
            return json(res, { ok: true });
          }

          res.statusCode = 405;
          res.end();
        } catch (e) {
          json(res, { error: String(e.message || e) }, 400);
        }
      });
    },
  };
}

export default defineConfig({
  // relative asset paths + everything inlined → dist/index.html opens straight from disk
  base: "./",
  plugins: [inspirationApi(), viteSingleFile()],
  server: {
    // writing a pasted image into public/ must NOT trigger a full page reload
    watch: { ignored: ["**/public/inspiration/**", "**/prompts/**"] },
  },
});

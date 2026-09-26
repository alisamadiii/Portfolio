import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  mkdirSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  createReadStream,
  readdirSync,
} from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = resolve(__dirname, "public/logos");

const MIME_EXT = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EXT_MIME = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// safe filename only: <uuid>-<side>.<ext>, no path traversal
function safeName(name) {
  return /^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name) ? name : null;
}

function logosApi() {
  return {
    name: "logos-api",
    configureServer(server) {
      mkdirSync(LOGOS_DIR, { recursive: true });

      // serve saved logos ourselves — Vite's publicDir fallback returns
      // index.html (text/html) for runtime-written files, breaking <img>
      server.middlewares.use("/logos", (req, res, next) => {
        const name = decodeURIComponent(req.url.split("?")[0].replace(/^\//, ""));
        if (!safeName(name)) return next();
        const file = join(LOGOS_DIR, name);
        if (!existsSync(file)) return next();
        const ext = name.split(".").pop().toLowerCase();
        res.setHeader("Content-Type", EXT_MIME[ext] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(file).pipe(res);
      });

      server.middlewares.use("/api/logos", async (req, res) => {
        try {
          if (req.method === "GET") {
            // list library — everything on disk (used by the gallery picker)
            const files = readdirSync(LOGOS_DIR)
              .filter((f) => safeName(f) && EXT_MIME[f.split(".").pop().toLowerCase()])
              .sort();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ files }));
            return;
          }
          if (req.method === "POST") {
            const { id, dataUrl } = JSON.parse(await readBody(req));
            const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
            if (!match) throw new Error("bad dataUrl");
            const ext = MIME_EXT[match[1]] || "bin";
            const name = `${id}.${ext}`;
            if (!safeName(name)) throw new Error("bad name");
            writeFileSync(join(LOGOS_DIR, name), Buffer.from(match[2], "base64"));
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ path: `/logos/${name}` }));
            return;
          }
          if (req.method === "DELETE") {
            const url = new URL(req.url, "http://x");
            const name = url.searchParams.get("name");
            if (name && safeName(name)) {
              const file = join(LOGOS_DIR, name);
              if (existsSync(file)) unlinkSync(file);
            }
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [logosApi()],
  server: {
    // writing an uploaded logo into public/ must NOT trigger a full page reload
    watch: { ignored: ["**/public/logos/**"] },
  },
});

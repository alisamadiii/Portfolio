import "server-only";

import { TRPCError } from "@trpc/server";

import {
  buildTree,
  FOLDER_MARKER,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  imageKey,
  INSPIRATION_PREFIX,
  isFolderPath,
  isImageName,
  nextFolderName,
  promptId,
  PROMPTS_KEY,
  type InspirationPrompt,
} from "./inspiration-shared";
import { deleteObject, getObjectText, listAllObjects, putObject } from "./r2";

// ─── Inspirations (server) ───────────────────────────────────────
// The inspiration/ folder of the media bucket. Admin router:
// routers/inspiration.ts. Layout + ordering rules: inspiration-shared.ts.

const bad = (message: string) => new TRPCError({ code: "BAD_REQUEST", message });

export async function listLibrary() {
  return buildTree(await listAllObjects(INSPIRATION_PREFIX));
}

export async function createFolder(parent: string, title: string) {
  if (parent && !isFolderPath(parent)) throw bad("Unknown folder.");
  const prefix = `${INSPIRATION_PREFIX}${parent ? `${parent}/` : ""}`;
  const objects = await listAllObjects(prefix);
  // direct child folder segments of `parent`
  const siblings = [
    ...new Set(
      objects
        .map((o) => o.key.slice(prefix.length).split("/"))
        .filter((parts) => parts.length > 1)
        .map((parts) => parts[0]!)
    ),
  ];
  const name = nextFolderName(siblings, title);
  const path = parent ? `${parent}/${name}` : name;
  await putObject(`${INSPIRATION_PREFIX}${path}/${FOLDER_MARKER}`, "", "text/plain");
  return { path };
}

export async function deleteFolder(path: string) {
  if (!isFolderPath(path)) throw bad("Unknown folder.");
  const objects = await listAllObjects(`${INSPIRATION_PREFIX}${path}/`);
  for (let i = 0; i < objects.length; i += 10) {
    await Promise.all(objects.slice(i, i + 10).map((o) => deleteObject(o.key)));
  }
  return { deleted: objects.length };
}

export async function addImage(folder: string, body: Uint8Array, type: string) {
  if (!isFolderPath(folder)) throw bad("Unknown folder.");
  const ext = IMAGE_TYPES[type];
  if (!ext) throw bad("Use a PNG, JPG, WebP, GIF, AVIF or SVG image.");
  if (body.byteLength > IMAGE_MAX_BYTES) throw bad("Images are capped at 10 MB.");
  const key = imageKey(folder, ext);
  const url = await putObject(key, body, type);
  return { key, url };
}

/** Fetched by the server so pasted links skip CORS. */
export async function addImageFromUrl(folder: string, rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw bad("That isn't a link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw bad("That isn't a web link.");
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) throw bad("Couldn't download that image.");
  const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (!IMAGE_TYPES[type]) throw bad("That link isn't an image.");
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > IMAGE_MAX_BYTES) throw bad("Images are capped at 10 MB.");
  return addImage(folder, new Uint8Array(await res.arrayBuffer()), type);
}

export async function deleteImage(key: string) {
  const rest = key.startsWith(INSPIRATION_PREFIX) ? key.slice(INSPIRATION_PREFIX.length) : "";
  const parts = rest.split("/");
  const file = parts.pop() ?? "";
  if (!parts.length || !isFolderPath(parts.join("/")) || !isImageName(file)) {
    throw bad("Unknown image.");
  }
  await deleteObject(key);
}

// ─── Prompts: one JSON file, read-modify-write ───────────────────

export async function listPrompts(): Promise<InspirationPrompt[]> {
  const text = await getObjectText(PROMPTS_KEY);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (p): p is InspirationPrompt =>
            !!p && typeof p.id === "string" && typeof p.title === "string" && typeof p.body === "string"
        )
      : [];
  } catch {
    return [];
  }
}

const savePrompts = (prompts: InspirationPrompt[]) =>
  putObject(PROMPTS_KEY, JSON.stringify(prompts, null, 2), "application/json");

export async function createPrompt(input: { title: string; body: string }) {
  const prompts = await listPrompts();
  const prompt = { id: promptId(input.title, prompts.map((p) => p.id)), ...input };
  // newest first, like the images
  await savePrompts([prompt, ...prompts]);
  return prompt;
}

export async function updatePrompt(input: InspirationPrompt) {
  const prompts = await listPrompts();
  if (!prompts.some((p) => p.id === input.id)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found." });
  }
  await savePrompts(prompts.map((p) => (p.id === input.id ? input : p)));
  return input;
}

export async function deletePrompt(id: string) {
  const prompts = await listPrompts();
  await savePrompts(prompts.filter((p) => p.id !== id));
}

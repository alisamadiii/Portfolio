// Get all codes from the database
// Load .env before any other imports so DATABASE_URL is set when drizzle loads
import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const getCodes = async () => {
  const { db } = await import("@workspace/drizzle/index");
  const { source, sourceFile, sourceMedia } =
    await import("@workspace/drizzle/schema");

  const rows = await db
    .select({
      source,
      file: sourceFile,
      media: sourceMedia,
    })
    .from(source)
    .leftJoin(sourceFile, eq(sourceFile.sourceId, source.id))
    .leftJoin(sourceMedia, eq(sourceMedia.sourceId, source.id));

  const filesBySourceId = new Map<string, (typeof sourceFile.$inferSelect)[]>();
  const mediaBySourceId = new Map<
    string,
    (typeof sourceMedia.$inferSelect)[]
  >();
  const sourcesOrder: (typeof source.$inferSelect)[] = [];
  const seenSourceIds = new Set<string>();
  const seenFileIds = new Map<string, Set<string>>();
  const seenMediaIds = new Map<string, Set<string>>();

  for (const row of rows) {
    const id = row.source.id;
    if (!seenSourceIds.has(id)) {
      seenSourceIds.add(id);
      sourcesOrder.push(row.source);
      seenFileIds.set(id, new Set());
      seenMediaIds.set(id, new Set());
    }
    if (row.file && !seenFileIds.get(id)!.has(row.file.id)) {
      seenFileIds.get(id)!.add(row.file.id);
      if (!filesBySourceId.has(id)) filesBySourceId.set(id, []);
      filesBySourceId.get(id)!.push(row.file);
    }
    if (row.media && !seenMediaIds.get(id)!.has(row.media.id)) {
      seenMediaIds.get(id)!.add(row.media.id);
      if (!mediaBySourceId.has(id)) mediaBySourceId.set(id, []);
      mediaBySourceId.get(id)!.push(row.media);
    }
  }

  return sourcesOrder.map((s) => ({
    ...s,
    files: filesBySourceId.get(s.id) ?? [],
    media: mediaBySourceId.get(s.id) ?? [],
  }));
};

function slug(title: string) {
  return title.toLowerCase().replace(/\s+/g, "-");
}

function escapeForTsString(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

getCodes().then(async (codes) => {
  console.log(codes);

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const animationsDir = resolve(scriptDir, "../animations");

  // Delete animations folder if it exists (avoid ENOENT when folder is missing)
  await fs.rm(animationsDir, { recursive: true, force: true });

  // Create folder and files for each source
  for (const source of codes) {
    if (!source.files || source.files.length === 0) continue;
    const folder = resolve(animationsDir, slug(source.title));
    await fs.mkdir(folder, { recursive: true });
    for (const file of source.files) {
      const filePath = resolve(folder, file.filename);
      await fs.writeFile(filePath, file.content);
    }
    console.log(`Created folder ${folder} for ${source.title}`);
  }

  // Build registry with all sources (single file, no trailing = ${JSON.stringify(source)})
  const lightMedia = (s: (typeof codes)[0]) =>
    s.media.find((m) => m.theme === "light" || !m.theme);
  const darkMedia = (s: (typeof codes)[0]) =>
    s.media.find((m) => m.theme === "dark");

  const entries = codes.map(
    (source) => `  "${slug(source.title)}": {
    id: "${source.id}",
    name: "${escapeForTsString(source.title)}",
    description: "${escapeForTsString(source.description ?? "")}",
    component: dynamic(
      () => import("./${slug(source.title)}/index"),
      { ssr: false, loading: () => <AnimationLoading /> }
    ),
    image: "${lightMedia(source)?.url ?? source.media[0]?.url ?? ""}",
    darkImage: "${darkMedia(source)?.url ?? source.media[0]?.url ?? ""}",
    isPremium: ${source.isPrivate ?? false},
  }`
  );

  const registryContent = `"use client";

import dynamic from "next/dynamic";

import { AnimationLoading } from "../components/animation-loading";

export const animations: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    component: React.ComponentType;
    image: string;
    darkImage?: string;
    isPremium?: boolean;
  }
> = {
${entries.join(",\n")},
};
`;

  const registryFilePath = resolve(animationsDir, "registry.tsx");
  await fs.writeFile(registryFilePath, registryContent);
});

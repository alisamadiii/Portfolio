// Get all codes from the database
// Load .env before any other imports so DATABASE_URL is set when drizzle loads
import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { asc, desc, eq } from "drizzle-orm";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const getCodes = async () => {
  const { db } = await import("@workspace/drizzle/index");
  const { source, sourceFile } = await import("@workspace/drizzle/schema");

  const rows = await db
    .select({
      source,
      file: sourceFile,
    })
    .from(source)
    .leftJoin(sourceFile, eq(sourceFile.sourceId, source.id))
    .orderBy(asc(source.isPrivate), desc(source.createdAt));

  const filesBySourceId = new Map<string, (typeof sourceFile.$inferSelect)[]>();
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
  }

  return sourcesOrder.map((s) => ({
    ...s,
    files: filesBySourceId.get(s.id) ?? [],
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

  const entries = codes.map(
    (source) => `  "${slug(source.title)}": {
    id: "${source.id}",
    name: "${escapeForTsString(source.title)}",
    description: "${escapeForTsString(source.description ?? "")}",
    component: dynamic(
      () => import("./${slug(source.title)}/index"),
      { ssr: false, loading: () => <AnimationLoading /> }
    ),
    image: "${source.imageUrl ?? ""}",
    darkImage: "${source.darkImageUrl ?? ""}",
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

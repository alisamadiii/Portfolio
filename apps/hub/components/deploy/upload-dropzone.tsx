"use client";

import { useCallback, useRef, useState } from "react";
import { unzip, zip } from "fflate";
import ignore, { type Ignore } from "ignore";
import { toast } from "sonner";

/**
 * Folder/zip picking and the browser → content-pilot upload, shared by the
 * first import (UploadImport) and "Import" inside an upload project
 * (ReplaceSourceDialog). A folder is packed into a zip in the browser
 * (fflate); either way one zip is uploaded STRAIGHT to content-pilot
 * (Vercel's request-body cap rules out proxying through the hub).
 */

export const MAX_ZIP_BYTES = 100 * 1024 * 1024;

export const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

// Heavy or derived directories that never belong in a site upload, skipped
// even without a .gitignore (and before reading it, so they're never walked).
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".vercel", "__MACOSX"]);
const SKIP_FILES = new Set([".DS_Store"]);

const isSkipped = (path: string) => {
  const segments = path.split("/");
  return (
    segments.slice(0, -1).some((s) => SKIP_DIRS.has(s)) ||
    SKIP_FILES.has(segments[segments.length - 1] ?? "")
  );
};

/**
 * Drops every path a .gitignore in the tree ignores (root and nested ones,
 * each relative to its own folder, like git). The .gitignore files stay.
 */
const gitignoreFilter = (gitignores: { path: string; text: string }[]) => {
  const rules: { dir: string; ig: Ignore }[] = gitignores.map(({ path, text }) => ({
    dir: path.slice(0, path.length - ".gitignore".length),
    ig: ignore().add(text),
  }));
  return (path: string) =>
    !rules.some(({ dir, ig }) => path.startsWith(dir) && ig.ignores(path.slice(dir.length)));
};

const isGitignore = (path: string) => path === ".gitignore" || path.endsWith("/.gitignore");

export type Picked = {
  name: string;
  files: { path: string; file: File }[];
  /** Files left out because a .gitignore ignores them (folder picks). */
  ignored?: number;
};

/** A folder pick with .gitignore'd files removed. */
const withGitignore = async (picked: Picked): Promise<Picked> => {
  const gitignores = await Promise.all(
    picked.files
      .filter((f) => isGitignore(f.path))
      .map(async (f) => ({ path: f.path, text: await f.file.text() }))
  );
  if (!gitignores.length) return picked;
  const keep = gitignoreFilter(gitignores);
  const files = picked.files.filter((f) => keep(f.path));
  return { ...picked, files, ignored: picked.files.length - files.length };
};

/** Recursively walk a dropped directory entry into { path, file } pairs. */
const walkEntry = async (
  entry: FileSystemEntry,
  prefix: string,
  out: { path: string; file: File }[]
): Promise<void> => {
  if (entry.isFile) {
    if (SKIP_FILES.has(entry.name)) return;
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    out.push({ path: `${prefix}${entry.name}`, file });
    return;
  }
  if (!entry.isDirectory || SKIP_DIRS.has(entry.name)) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns batches of <=100; drain until empty.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (!batch.length) break;
    for (const child of batch) {
      await walkEntry(child, `${prefix}${entry.name}/`, out);
    }
  }
};

/** Strip the folder's own name from webkitdirectory paths and filter noise. */
const fromFileList = async (files: File[]): Promise<Picked | null> => {
  const list: { path: string; file: File }[] = [];
  let root = "";
  for (const file of files) {
    const rel = file.webkitRelativePath || file.name;
    const segments = rel.split("/");
    root = segments[0] ?? "";
    const inner = segments.slice(1);
    const path = inner.join("/") || file.name;
    if (isSkipped(path)) continue;
    list.push({ path, file });
  }
  if (!list.length) return null;
  const picked = await withGitignore({ name: root || "site", files: list });
  return picked.files.length ? picked : null;
};

const isZipPick = (picked: Picked) =>
  picked.files.length === 1 && /\.zip$/i.test(picked.files[0]!.path);

const packZip = async (picked: Picked): Promise<Blob> => {
  const tree: Record<string, Uint8Array> = {};
  let total = 0;
  for (const { path, file } of picked.files) {
    total += file.size;
    if (total > MAX_ZIP_BYTES) {
      throw new Error("The folder is larger than 100 MB.");
    }
    tree[path] = new Uint8Array(await file.arrayBuffer());
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(tree, { level: 6 }, (err, data) =>
      err ? reject(err) : resolve(data)
    )
  );
  return new Blob([bytes as BlobPart], { type: "application/zip" });
};

/**
 * A picked zip with the same filtering as a folder: skipped dirs and
 * .gitignore'd files removed.
 */
const cleanZip = async (file: File): Promise<Blob> => {
  const data = new Uint8Array(await file.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(
      data,
      // Never inflate node_modules & co, they're the bulk of a bad zip.
      { filter: (f) => !f.name.endsWith("/") && !isSkipped(f.name) },
      (err, data) => (err ? reject(err) : resolve(data))
    )
  );
  const decoder = new TextDecoder();
  const keep = gitignoreFilter(
    Object.keys(entries)
      .filter(isGitignore)
      .map((path) => ({ path, text: decoder.decode(entries[path]) }))
  );
  const tree: Record<string, Uint8Array> = {};
  for (const [path, bytes] of Object.entries(entries)) {
    if (keep(path)) tree[path] = bytes;
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(tree, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)))
  );
  return new Blob([bytes as BlobPart], { type: "application/zip" });
};

/** The picked zip (cleaned), or the picked folder packed into one. Size-checked. */
export const zipForUpload = async (picked: Picked): Promise<Blob> => {
  const blob = isZipPick(picked) ? await cleanZip(picked.files[0]!.file) : await packZip(picked);
  if (blob.size > MAX_ZIP_BYTES) {
    throw new Error("The upload is larger than 100 MB.");
  }
  return blob;
};

export const uploadZip = (
  url: string,
  token: string,
  blob: Blob,
  onProgress: (fraction: number) => void
): Promise<{ ok: boolean; status: number; error?: string }> =>
  new Promise((resolve, reject) => {
    // XHR instead of fetch for upload progress events.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let error: string | undefined;
      try {
        error = (JSON.parse(xhr.responseText) as { error?: string }).error;
      } catch {
        // Non-JSON error body.
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, error });
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(blob);
  });

/** Drag a folder or zip, or click to pick one. */
export const UploadDropzone = ({
  picked,
  onPick,
}: {
  picked: Picked | null;
  onPick: (next: Picked) => void;
}) => {
  const [dragOver, setDragOver] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback(
    (next: Picked | null) => {
      if (next) onPick(next);
    },
    [onPick]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      const items = Array.from(event.dataTransfer.items ?? []);
      const entry = items[0]?.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const files: { path: string; file: File }[] = [];
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        for (;;) {
          const batch = await new Promise<FileSystemEntry[]>(
            (resolve, reject) => reader.readEntries(resolve, reject)
          );
          if (!batch.length) break;
          for (const child of batch) await walkEntry(child, "", files);
        }
        const cleaned = files.length ? await withGitignore({ name: entry.name, files }) : null;
        pick(cleaned?.files.length ? cleaned : null);
        return;
      }
      const file = event.dataTransfer.files?.[0];
      if (file && /\.zip$/i.test(file.name)) {
        pick({ name: file.name, files: [{ path: file.name, file }] });
      } else if (file) {
        toast.error("Drop a folder or a .zip file.");
      }
    },
    [pick]
  );

  const fileCount = picked
    ? isZipPick(picked)
      ? "zip file"
      : `${picked.files.length} files`
    : null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => zipInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && zipInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        {picked ? (
          <>
            <p className="text-[14px] font-medium">{picked.name}</p>
            <p className="text-muted-foreground mt-1 text-[12.5px]">
              {fileCount} ready to upload
              {picked.ignored ? ` · ${picked.ignored} ignored by .gitignore` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-medium">
              Drag a folder or .zip here
            </p>
            <p className="text-muted-foreground mt-1 text-[12.5px]">
              or click to pick a zip
              {" · "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
              >
                choose a folder
              </button>
            </p>
          </>
        )}
      </div>
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pick({ name: file.name, files: [{ path: file.name, file }] });
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is a non-standard but universal attribute
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(e) => {
          // Copy before clearing the input, which empties its FileList.
          const files = Array.from(e.target.files ?? []);
          if (files.length) void fromFileList(files).then(pick);
          e.target.value = "";
        }}
      />
    </>
  );
};

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ChevronRight, Copy, FolderPlus, Images, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import {
  countImages,
  coverImages,
  flattenFolders,
  humanize,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  type InspirationFolder,
  type InspirationImage,
} from "@workspace/trpc/lib/inspiration-shared";
import { Dialog, DialogContent, DialogTitle } from "@workspace/ui/components/dialog";

import { Badge } from "@/components/ds/ui/badge";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { EmptyState } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { PageHeader } from "@/components/ds/layout/page-header";
import { isAdminUser } from "@/lib/authz-shared";
import { handleCmsError } from "@/lib/trpc-errors";

import { FolderDialog } from "./folder-dialog";
import { PromptsTab } from "./prompts-tab";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const toBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Admin only: the design inspiration board. Folders + images live in the
 * media bucket under inspiration/; prompts in inspiration/_prompts.json.
 * URL state: ?tab=prompts, ?path=<folder path>, ?q=<filter>.
 */
export function InspirationsPage() {
  const user = useCurrentUser();
  const isAdmin = isAdminUser(user.data?.user);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const library = useQuery(trpc.inspiration.library.queryOptions(undefined, { enabled: isAdmin }));
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = params.get("tab") === "prompts" ? "prompts" : "images";
  const path = params.get("path") ?? "";
  const q = params.get("q") ?? "";
  const [newFolder, setNewFolder] = useState(false);
  const [lightbox, setLightbox] = useState<InspirationImage | null>(null);
  const [dropping, setDropping] = useState(false);
  const [confirm, setConfirm] = useState<
    { kind: "folder"; folder: InspirationFolder } | { kind: "image"; image: InspirationImage } | null
  >(null);
  const picker = useRef<HTMLInputElement>(null);

  const go = (next: { tab?: string; path?: string; q?: string }) => {
    const out = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    if (nextTab === "prompts") out.set("tab", "prompts");
    const nextPath = next.path ?? (next.tab ? "" : path);
    if (nextTab === "images" && nextPath) out.set("path", nextPath);
    const nextQ = next.q ?? (next.tab || next.path !== undefined ? "" : q);
    if (nextQ) out.set("q", nextQ);
    const url = out.size ? `${pathname}?${out}` : pathname;
    if (next.q !== undefined) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  const folders = library.data ?? [];
  const all = flattenFolders(folders);
  const current = path ? all.find((f) => f.path === path) ?? null : null;
  const totalImages = folders.reduce((n, f) => n + countImages(f), 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.inspiration.library.queryKey() });
  const onError = (fallback: string) => (e: Parameters<typeof handleCmsError>[0]) =>
    toast.error(handleCmsError(e, fallback));

  const addImage = useMutation(
    trpc.inspiration.addImage.mutationOptions({ onSuccess: invalidate, onError: onError("Couldn't save that image.") })
  );
  const addFromUrl = useMutation(
    trpc.inspiration.addImageFromUrl.mutationOptions({
      onSuccess: invalidate,
      onError: onError("Couldn't save that image."),
    })
  );
  const deleteImage = useMutation(
    trpc.inspiration.deleteImage.mutationOptions({
      onSuccess: () => {
        toast.success("Image deleted.");
        void invalidate();
      },
      onError: onError("Couldn't delete the image."),
    })
  );
  const deleteFolder = useMutation(
    trpc.inspiration.deleteFolder.mutationOptions({
      onSuccess: (_, input) => {
        toast.success("Folder deleted.");
        void invalidate();
        // leaving a deleted folder: go to its parent
        if (path === input.path || path.startsWith(`${input.path}/`)) {
          go({ path: input.path.includes("/") ? input.path.slice(0, input.path.lastIndexOf("/")) : "" });
        }
      },
      onError: onError("Couldn't delete the folder."),
    })
  );

  const saveFiles = async (files: File[]) => {
    if (!current) return;
    const images = files.filter((f) => IMAGE_TYPES[f.type]);
    if (!images.length) return toast.error("Use a PNG, JPG, WebP, GIF, AVIF or SVG image.");
    for (const file of images) {
      if (file.size > IMAGE_MAX_BYTES) {
        toast.error(`${file.name} is over 10 MB.`);
        continue;
      }
      await addImage.mutateAsync({ folder: current.path, type: file.type, data: await toBase64(file) }).catch(() => {});
    }
    toast.success(images.length === 1 ? "Image saved." : `${images.length} images saved.`);
  };

  // ⌘V in an open folder: image files, copied <img> HTML, or a link.
  useEffect(() => {
    if (!current || tab !== "images") return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      const data = e.clipboardData;
      if (!data) return;
      const files = [...data.files];
      if (files.length) {
        e.preventDefault();
        void saveFiles(files);
        return;
      }
      const html = data.getData("text/html");
      const fromHtml = html && /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1];
      const text = data.getData("text/uri-list") || data.getData("text/plain");
      const url = fromHtml && /^https?:/.test(fromHtml) ? fromHtml : text.trim();
      if (/^https?:\/\/\S+$/.test(url)) {
        e.preventDefault();
        addFromUrl.mutate(
          { folder: current.path, url },
          { onSuccess: () => toast.success("Image saved.") }
        );
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.path, tab]);

  if (!user.isPending && !isAdmin) {
    return (
      <Card>
        <EmptyState
          icon={<Images className="size-5" />}
          title="Admins only"
          text="Inspirations are only visible to the agency team."
        />
      </Card>
    );
  }

  const saving = addImage.isPending || addFromUrl.isPending;
  const needle = q.trim().toLowerCase();
  const shownFolders = needle
    ? all.filter((f) => f.title.toLowerCase().includes(needle) || f.name.includes(needle))
    : current
      ? current.children
      : folders;

  return (
    <>
      <PageHeader
        title="Inspirations"
        count={library.data ? totalImages : undefined}
        description="Design references for client websites. Saved in the media bucket under inspiration/."
        actions={
          tab === "images" && (
            <>
              <Button icon={<FolderPlus className="size-4" />} onClick={() => setNewFolder(true)}>
                New folder
              </Button>
              {current && (
                <Button
                  variant="primary"
                  icon={<Upload className="size-4" />}
                  disabled={saving}
                  onClick={() => picker.current?.click()}
                >
                  {saving ? "Saving…" : "Add images"}
                </Button>
              )}
            </>
          )
        }
        tabs={
          <UnderlineTabs
            label="Inspirations"
            value={tab}
            onChange={(id) => go({ tab: id })}
            items={[
              { id: "images", label: "Images", count: library.data ? totalImages : undefined },
              { id: "prompts", label: "Prompts" },
            ]}
          />
        }
      />
      <input
        ref={picker}
        type="file"
        multiple
        accept={Object.keys(IMAGE_TYPES).join(",")}
        className="hidden"
        onChange={(e) => {
          void saveFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />

      {tab === "prompts" ? (
        <PromptsTab q={q} onSearch={(value) => go({ q: value })} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              <Link
                href={pathname}
                className={current ? "text-dim hover:text-ink" : "font-semibold text-ink"}
              >
                All folders
              </Link>
              {current &&
                current.path.split("/").map((seg, i, segs) => {
                  const segPath = segs.slice(0, i + 1).join("/");
                  const last = i === segs.length - 1;
                  return (
                    <span key={segPath} className="flex items-center gap-1">
                      <ChevronRight className="size-3.5 text-faint" aria-hidden />
                      {last ? (
                        <span className="font-semibold text-ink">{humanize(seg)}</span>
                      ) : (
                        <Link href={`${pathname}?path=${encodeURIComponent(segPath)}`} className="text-dim hover:text-ink">
                          {humanize(seg)}
                        </Link>
                      )}
                    </span>
                  );
                })}
            </nav>
            <div className="flex-1" />
            {!current && (
              <label className="flex h-9 w-[240px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
                <Search className="size-4" aria-hidden />
                <input
                  type="search"
                  aria-label="Filter folders"
                  placeholder="Filter folders"
                  value={q}
                  onChange={(e) => go({ q: e.target.value })}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
                />
              </label>
            )}
            {current && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="size-3.5" />}
                onClick={() => setConfirm({ kind: "folder", folder: current })}
              >
                Delete folder
              </Button>
            )}
          </div>

          {library.isPending && isAdmin && (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-[170px] animate-pulse rounded-card border border-line bg-surface" />
              ))}
            </div>
          )}
          {library.isError && (
            <Card>
              <EmptyState icon={<Images className="size-5" />} title="Couldn't load the library" text={library.error.message} />
            </Card>
          )}
          {library.data && path && !current && (
            <Card>
              <EmptyState icon={<Images className="size-5" />} title="Folder not found" text="It may have been deleted." />
            </Card>
          )}

          {library.data && (!path || current) && (
            <div
              className="relative flex flex-col gap-5"
              onDragEnter={(e) => {
                if (current && e.dataTransfer.types.includes("Files")) setDropping(true);
              }}
              onDragOver={(e) => current && e.preventDefault()}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
              }}
              onDrop={(e) => {
                if (!current) return;
                e.preventDefault();
                setDropping(false);
                void saveFiles([...e.dataTransfer.files]);
              }}
            >
              {shownFolders.length > 0 && (
                <section className="flex flex-col gap-3">
                  {current && <h2 className="text-base font-semibold">Folders</h2>}
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                    {shownFolders.map((folder) => (
                      <FolderCard
                        key={folder.path}
                        folder={folder}
                        showParent={!!needle}
                        href={`${pathname}?path=${encodeURIComponent(folder.path)}`}
                      />
                    ))}
                  </div>
                </section>
              )}
              {needle && shownFolders.length === 0 && (
                <p className="text-[13px] text-dim">No folders match &ldquo;{q}&rdquo;.</p>
              )}
              {!current && folders.length === 0 && (
                <Card>
                  <EmptyState
                    icon={<Images className="size-5" />}
                    title="No folders yet"
                    text="Create a folder, open it and paste or drop images in."
                  />
                </Card>
              )}

              {current && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Images <span className="font-normal text-faint">{current.images.length}</span>
                  </h2>
                  {current.images.length === 0 ? (
                    <Card>
                      <EmptyState
                        icon={<Plus className="size-5" />}
                        title="No images here yet"
                        text="Paste an image or a link (⌘V), drop files here, or use Add images."
                      />
                    </Card>
                  ) : (
                    <div
                      className="grid items-start gap-3"
                      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
                    >
                      {current.images.map((image) => (
                        <ImageCard
                          key={image.key}
                          image={image}
                          onOpen={() => setLightbox(image)}
                          onDelete={() => setConfirm({ kind: "image", image })}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {dropping && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-card border-2 border-dashed border-coral bg-coral-soft/60 text-sm font-semibold text-ink">
                  Drop to save
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-h-[92dvh] w-auto max-w-[92vw] gap-0 overflow-hidden bg-transparent p-0 ring-0 sm:max-w-[92vw] md:max-w-[92vw]">
          <DialogTitle className="sr-only">Image</DialogTitle>
          {lightbox && <Lightbox image={lightbox} onClose={() => setLightbox(null)} />}
        </DialogContent>
      </Dialog>

      {tab === "images" && (
        <FolderDialog open={newFolder} onOpenChange={setNewFolder} parent={current} onCreated={(p) => go({ path: p })} />
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        danger
        title={confirm?.kind === "folder" ? `Delete ${confirm.folder.title}?` : "Delete this image?"}
        description={
          confirm?.kind === "folder"
            ? (() => {
                const subs = flattenFolders(confirm.folder.children).length;
                const n = countImages(confirm.folder);
                const what = [subs && plural(subs, "subfolder"), n && plural(n, "image")].filter(Boolean).join(" and ");
                return what ? `This also deletes ${what}. It can't be undone.` : "It can't be undone.";
              })()
            : "It's removed from the bucket. It can't be undone."
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirm?.kind === "folder") deleteFolder.mutate({ path: confirm.folder.path });
          if (confirm?.kind === "image") deleteImage.mutate({ key: confirm.image.key });
          setConfirm(null);
        }}
      />
    </>
  );
}

// Taller than ~1.6x its width: a full-page screenshot, not a section.
const isTall = (img: HTMLImageElement) => img.naturalHeight > img.naturalWidth * 1.6;

/** Fits normal shots in the viewport; full pages open at reading width and scroll. */
function Lightbox({ image, onClose }: { image: InspirationImage; onClose: () => void }) {
  const [tall, setTall] = useState(false);
  return tall ? (
    <div className="max-h-[92dvh] overflow-y-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="" className="block h-auto w-[min(1200px,92vw)]" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt=""
      onLoad={(e) => setTall(isTall(e.currentTarget))}
      onClick={onClose}
      className="block h-auto max-h-[92dvh] w-[min(1400px,92vw)] cursor-zoom-out object-contain"
    />
  );
}

function FolderCard({ folder, href, showParent }: { folder: InspirationFolder; href: string; showParent: boolean }) {
  const covers = coverImages(folder);
  const images = countImages(folder);
  const parent = showParent && folder.path.includes("/") ? folder.path.slice(0, folder.path.lastIndexOf("/")) : "";
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-card border border-line bg-surface p-3 hover:border-line-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      <div className="relative h-[96px] overflow-hidden rounded-control bg-subtle">
        {covers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-faint">
            <Images className="size-6" strokeWidth={1.5} aria-hidden />
          </div>
        ) : (
          covers
            .slice()
            .reverse()
            .map((img, i, arr) => {
              const depth = arr.length - 1 - i;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.key}
                  src={img.url}
                  alt=""
                  loading="lazy"
                  className="absolute left-1/2 top-2 h-[88px] w-[78%] rounded-[4px] border border-line object-cover object-top shadow-sm transition-transform group-hover:-translate-y-0.5"
                  style={{ transform: `translateX(-50%) translateY(${depth * 6}px) rotate(${(depth - 1) * 3}deg)` }}
                />
              );
            })
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-ink">{folder.title}</span>
        <span className="truncate text-[13px] text-dim">
          {[folder.children.length && plural(folder.children.length, "folder"), plural(images, "image")]
            .filter(Boolean)
            .join(" · ")}
          {parent && ` · in ${parent.split("/").map(humanize).join(" / ")}`}
        </span>
      </div>
    </Link>
  );
}

function ImageCard({
  image,
  onOpen,
  onDelete,
}: {
  image: InspirationImage;
  onOpen: () => void;
  onDelete: () => void;
}) {
  // Full-page screenshots: the tile shows the top, and hovering scrolls
  // through the page at a steady speed, then back up.
  const frame = useRef<HTMLButtonElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [tall, setTall] = useState(false);
  const [offset, setOffset] = useState(0);
  const [duration, setDuration] = useState(0);
  const scroll = (down: boolean) => {
    if (!tall || !img.current || !frame.current) return;
    const distance = Math.max(0, img.current.offsetHeight - frame.current.clientHeight);
    setDuration(down ? Math.min(12_000, distance * 4) : 400);
    setOffset(down ? distance : 0);
  };

  const copy = async () => {
    try {
      const blob = await (await fetch(image.url, { mode: "cors" })).blob();
      // the clipboard takes PNG everywhere; redraw anything else
      const png =
        blob.type === "image/png"
          ? blob
          : await new Promise<Blob>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d")?.drawImage(img, 0, 0);
                canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/png");
              };
              img.onerror = reject;
              img.src = URL.createObjectURL(blob);
            });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      toast.success("Image copied.");
    } catch {
      await navigator.clipboard.writeText(image.url);
      toast.success("Image link copied.");
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-card border border-line bg-surface">
      <button
        ref={frame}
        type="button"
        onClick={onOpen}
        onMouseEnter={() => scroll(true)}
        onMouseLeave={() => scroll(false)}
        onFocus={() => scroll(true)}
        onBlur={() => scroll(false)}
        className="relative block max-h-[360px] w-full cursor-zoom-in overflow-hidden"
        aria-label={tall ? "Open full page" : "Open image"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          src={image.url}
          alt=""
          loading="lazy"
          onLoad={(e) => setTall(isTall(e.currentTarget))}
          className="block h-auto w-full ease-out"
          style={{ transform: `translateY(-${offset}px)`, transition: `transform ${duration}ms ease-out` }}
        />
        {tall && offset === 0 && (
          <>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
            <span className="pointer-events-none absolute bottom-2 left-2">
              <Badge icon={<ArrowDownToLine className="size-3" />}>Full page</Badge>
            </span>
          </>
        )}
      </button>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton aria-label="Copy image" onClick={copy} className="size-8 bg-surface shadow-sm">
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton aria-label="Delete image" onClick={onDelete} className="size-8 bg-surface text-danger shadow-sm">
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

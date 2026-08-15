"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import {
  ArrowLeft,
  Frame,
  Loader2,
  Maximize,
  Minus,
  Plus,
  Settings2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { cn } from "@workspace/ui/lib/utils";

import {
  buildEntryMap,
  candidatesFor,
  flattenTextValues,
  resolveFieldEntry,
  setValueAtPath,
  TEXT_FIELD_TYPES,
  type EntryRoute,
} from "@/lib/canvas-entries";
import { parseBridgeMessage, postSet } from "@/lib/bridge-messages";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDrafts,
} from "@/lib/store/drafts";

import { usePublish } from "@/components/publish/publish-context";
import { SiteConfigSheet } from "@/components/canvas/site-config-sheet";
import {
  CanvasFrame,
  type CanvasPageInfo,
  type FrameRect,
} from "@/components/canvas/canvas-frame";
import { useCanvasCamera } from "@/components/canvas/use-canvas-camera";

/**
 * Figma-like canvas: every page of the live site as a frame on a pan/zoom
 * surface, text edited in place via the cms-bridge running inside each
 * iframe. Edits land in the same localStorage drafts the form editor and
 * publish dialog use.
 *
 * Performance: frames sit at static world coordinates inside one transformed
 * container — panning writes a single CSS transform (no React state). Iframes
 * mount only when their frame nears the viewport (camera-math culling), at
 * most MAX_LOADING load concurrently, and at most MAX_MOUNTED stay mounted
 * (LRU eviction back to placeholder).
 */

const FRAME_W = 1440;
const FRAME_H = 900;
const GAP = 160;
const MAX_LOADING = 3;
const MAX_MOUNTED = 12;

type WorkingCopy = {
  entry: EntryRoute;
  sha: string | null;
  values: Record<string, unknown>;
};

export function Canvas() {
  const { config } = useConfig();
  const trpc = useTRPC();
  const { draftCount, openPublishDialog } = usePublish();

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const repoBase = `/${owner}/${repo}/${encodeURIComponent(branch)}`;

  const pagesQuery = useQuery(
    trpc.cms.pages.list.queryOptions(
      { owner, repo, branch },
      { enabled: Boolean(owner && repo && branch), staleTime: 60_000 }
    )
  );

  const pages: CanvasPageInfo[] = useMemo(
    () => pagesQuery.data?.pages ?? [],
    [pagesQuery.data]
  );
  const siteOrigin = pagesQuery.data?.origin ?? null;

  const entryMap = useMemo(() => buildEntryMap(config), [config]);

  // ------------------------------------------------------------------
  // Layout: static world rects, grid of ~sqrt(n) columns.
  // ------------------------------------------------------------------
  const rects = useMemo(() => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(pages.length)));
    const map = new Map<string, FrameRect>();
    pages.forEach((page, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      map.set(page.path, {
        x: col * (FRAME_W + GAP),
        y: row * (FRAME_H + GAP),
        width: FRAME_W,
        height: FRAME_H,
      });
    });
    return map;
  }, [pages]);

  const worldBounds = useMemo(() => {
    if (rects.size === 0) return { x: 0, y: 0, width: FRAME_W, height: FRAME_H };
    let maxX = 0;
    let maxY = 0;
    for (const rect of rects.values()) {
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
    return { x: -GAP / 2, y: -GAP, width: maxX + GAP, height: maxY + GAP * 1.5 };
  }, [rects]);

  const { viewportRef, worldRef, committed, setCamera, fitBounds } =
    useCanvasCamera();

  /** Engage zoom: frame fills the viewport (with headroom for its title bar). */
  const zoomToFrame = useCallback(
    (path: string) => {
      const rect = rects.get(path);
      if (!rect) return;
      fitBounds(
        {
          x: rect.x - 24,
          y: rect.y - 72,
          width: rect.width + 48,
          height: rect.height + 96,
        },
        { animate: true, padding: 1, maxScale: 1 }
      );
    },
    [rects, fitBounds]
  );

  // Fit all frames once pages arrive.
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || pages.length === 0) return;
    fittedRef.current = true;
    fitBounds(worldBounds);
  }, [pages.length, worldBounds, fitBounds]);

  // ------------------------------------------------------------------
  // Culling: viewport rect → world space (+1 viewport margin each side).
  // ------------------------------------------------------------------
  const visibleSet = useMemo(() => {
    const viewport = viewportRef.current;
    const set = new Set<string>();
    if (!viewport || pages.length === 0) return set;
    const { width: vw, height: vh } = viewport.getBoundingClientRect();
    const { x, y, scale } = committed;
    const wx = (0 - x) / scale - vw / scale;
    const wy = (0 - y) / scale - vh / scale;
    const ww = (vw / scale) * 3;
    const wh = (vh / scale) * 3;
    for (const [key, rect] of rects) {
      if (
        rect.x < wx + ww &&
        rect.x + rect.width > wx &&
        rect.y < wy + wh &&
        rect.y + rect.height > wy
      ) {
        set.add(key);
      }
    }
    return set;
    // viewportRef is a ref — reading it here is fine; committed drives recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committed, rects, pages.length]);

  // ------------------------------------------------------------------
  // Frame lifecycle: queue → live (≤MAX_LOADING loading) → LRU evict.
  // ------------------------------------------------------------------
  const [mountedKeys, setMountedKeys] = useState<string[]>([]);
  const loadedRef = useRef<Set<string>>(new Set());
  const [loadTick, setLoadTick] = useState(0);

  useEffect(() => {
    setMountedKeys((current) => {
      const mounted = current.filter((key) => rects.has(key));
      const mountedSet = new Set(mounted);
      const loadingCount = mounted.filter(
        (key) => !loadedRef.current.has(key)
      ).length;

      // Nearest-to-center first among unmounted visible frames.
      const center = (() => {
        const viewport = viewportRef.current;
        if (!viewport) return { x: 0, y: 0 };
        const { width: vw, height: vh } = viewport.getBoundingClientRect();
        return {
          x: (vw / 2 - committed.x) / committed.scale,
          y: (vh / 2 - committed.y) / committed.scale,
        };
      })();
      const candidates = Array.from(visibleSet)
        .filter((key) => !mountedSet.has(key))
        .sort((a, b) => {
          const ra = rects.get(a)!;
          const rb = rects.get(b)!;
          const da =
            (ra.x + ra.width / 2 - center.x) ** 2 +
            (ra.y + ra.height / 2 - center.y) ** 2;
          const db =
            (rb.x + rb.width / 2 - center.x) ** 2 +
            (rb.y + rb.height / 2 - center.y) ** 2;
          return da - db;
        });

      const slots = Math.max(0, MAX_LOADING - loadingCount);
      let next = [...mounted, ...candidates.slice(0, slots)];

      // LRU eviction: offscreen frames first (front of the list is oldest).
      if (next.length > MAX_MOUNTED) {
        const keep: string[] = [];
        let toEvict = next.length - MAX_MOUNTED;
        for (const key of next) {
          if (toEvict > 0 && !visibleSet.has(key)) {
            toEvict -= 1;
            loadedRef.current.delete(key);
            continue;
          }
          keep.push(key);
        }
        next = keep;
      }

      return next.length === current.length &&
        next.every((key, index) => key === current[index])
        ? current
        : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSet, rects, committed, loadTick]);

  const handleFrameLoad = useCallback((path: string) => {
    loadedRef.current.add(path);
    setLoadTick((tick) => tick + 1);
  }, []);

  // ------------------------------------------------------------------
  // Edit controller: iframe messages → entry resolution → drafts.
  // ------------------------------------------------------------------
  const framesRef = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const registerFrame = useCallback(
    (path: string, iframe: HTMLIFrameElement | null) => {
      if (iframe) framesRef.current.set(path, iframe);
      else framesRef.current.delete(path);
    },
    []
  );

  const copiesRef = useRef<Map<string, WorkingCopy>>(new Map());
  const dirtyRef = useRef<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [engagedKey, setEngagedKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copiesVersion, setCopiesVersion] = useState(0);

  // Prefetch every mapped entry (content + sha) so commits can build drafts.
  const entryQueries = useQueries({
    queries: entryMap.routes.map((entry) =>
      trpc.cms.entries.get.queryOptions(
        {
          owner,
          repo,
          branch,
          path: entry.filePath,
          name: entry.name,
        },
        { enabled: Boolean(owner && repo && branch), staleTime: 30_000 }
      )
    ),
  });

  useEffect(() => {
    let changed = false;
    entryMap.routes.forEach((entry, index) => {
      const query = entryQueries[index];
      const data = query?.data;
      // The meta-only union member has no contentObject — narrow on it.
      if (!data || !("contentObject" in data) || copiesRef.current.has(entry.name))
        return;
      const draft = getDraft(owner, repo, branch, entry.filePath);
      copiesRef.current.set(entry.name, {
        entry,
        sha: draft?.sha ?? data.sha ?? null,
        values:
          (draft?.values as Record<string, unknown> | undefined) ??
          (data.contentObject as Record<string, unknown>),
      });
      if (draft) dirtyRef.current.add(entry.name);
      changed = true;
    });
    if (changed) setCopiesVersion((version) => version + 1);
  }, [entryQueries, entryMap, owner, repo, branch]);

  /** Push current draft values into one frame (used on ready + remount). */
  const pushDraftsToFrame = useCallback(
    (framePath: string) => {
      if (!siteOrigin) return;
      const iframe = framesRef.current.get(framePath);
      if (!iframe?.contentWindow) return;
      const values: Array<{ path: string; value: string }> = [];
      for (const entry of candidatesFor(entryMap, framePath)) {
        if (!dirtyRef.current.has(entry.name)) continue;
        const copy = copiesRef.current.get(entry.name);
        if (copy) values.push(...flattenTextValues(copy.values));
      }
      postSet(iframe.contentWindow, siteOrigin, values);
    },
    [entryMap, siteOrigin]
  );

  /** Broadcast one changed value to every mounted frame that shows it. */
  const propagate = useCallback(
    (entryName: string, fieldPath: string, value: string, exclude?: string) => {
      if (!siteOrigin) return;
      for (const [framePath, iframe] of framesRef.current) {
        if (framePath === exclude || !iframe.contentWindow) continue;
        const shows = candidatesFor(entryMap, framePath).some(
          (entry) => entry.name === entryName
        );
        if (shows) {
          postSet(iframe.contentWindow, siteOrigin, [
            { path: fieldPath, value },
          ]);
        }
      }
    },
    [entryMap, siteOrigin]
  );

  const commitEdit = useCallback(
    (framePath: string, fieldPath: string, rawValue: string) => {
      const candidates = candidatesFor(entryMap, framePath);
      const resolved = resolveFieldEntry(candidates, fieldPath);
      if (!resolved) {
        toast.warning(`No CMS field maps to "${fieldPath}" on ${framePath}.`);
        return;
      }
      const { entry, field } = resolved;
      if (!TEXT_FIELD_TYPES.has(field.type)) {
        toast.info("This element isn't text-editable yet — use the form view.");
        return;
      }
      const copy = copiesRef.current.get(entry.name);
      if (!copy) {
        toast.error("Entry content is still loading — try again in a moment.");
        return;
      }
      const value =
        field.type === "number" && rawValue.trim() !== ""
          ? Number(rawValue)
          : rawValue;
      copy.values = setValueAtPath(copy.values, fieldPath, value);
      dirtyRef.current.add(entry.name);
      try {
        saveDraftOrThrow(draftKey(owner, repo, branch, entry.filePath), {
          v: 1,
          path: entry.filePath,
          schemaName: entry.name,
          sha: copy.sha,
          isNew: false,
          values: copy.values,
          savedAt: Date.now(),
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft."
        );
        return;
      }
      setCopiesVersion((version) => version + 1);
      propagate(entry.name, fieldPath, rawValue, framePath);
    },
    [entryMap, owner, repo, branch, propagate]
  );

  // Single window-level message listener; frames identified by event.source
  // (all frames share one origin — origin alone can't tell them apart).
  useEffect(() => {
    if (!siteOrigin) return;
    const onMessage = (event: MessageEvent) => {
      const msg = parseBridgeMessage(event, siteOrigin);
      if (!msg) return;
      let framePath: string | null = null;
      for (const [key, iframe] of framesRef.current) {
        if (iframe.contentWindow === event.source) {
          framePath = key;
          break;
        }
      }
      if (!framePath) return;
      switch (msg.type) {
        case "ready":
          handleFrameLoad(framePath);
          pushDraftsToFrame(framePath);
          break;
        case "field-commit":
          commitEdit(framePath, msg.path, msg.value);
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [siteOrigin, commitEdit, pushDraftsToFrame, handleFrameLoad]);

  // ------------------------------------------------------------------
  // Site config sheet (global entry, e.g. `site`).
  // ------------------------------------------------------------------
  const globalEntry = entryMap.globals.length
    ? (entryMap.byName.get(entryMap.globals[0]!) ?? null)
    : null;
  const globalCopy = globalEntry
    ? (copiesRef.current.get(globalEntry.name) ?? null)
    : null;

  const handleSiteConfigSave = useCallback(
    (values: Record<string, unknown>) => {
      if (!globalEntry) return;
      const copy = copiesRef.current.get(globalEntry.name);
      if (!copy) return;
      copy.values = values;
      dirtyRef.current.add(globalEntry.name);
      try {
        saveDraftOrThrow(draftKey(owner, repo, branch, globalEntry.filePath), {
          v: 1,
          path: globalEntry.filePath,
          schemaName: globalEntry.name,
          sha: copy.sha,
          isNew: false,
          values,
          savedAt: Date.now(),
        });
        toast.success("Draft saved on this device");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft."
        );
        return;
      }
      setCopiesVersion((version) => version + 1);
      // Push everything (values may have changed in bulk).
      if (siteOrigin) {
        const flattened = flattenTextValues(values);
        for (const iframe of framesRef.current.values()) {
          postSet(iframe.contentWindow, siteOrigin, flattened);
        }
      }
    },
    [globalEntry, owner, repo, branch, siteOrigin]
  );

  const handleSiteConfigLiveChange = useCallback(
    (values: Record<string, unknown>) => {
      if (!siteOrigin) return;
      const flattened = flattenTextValues(values);
      for (const iframe of framesRef.current.values()) {
        postSet(iframe.contentWindow, siteOrigin, flattened);
      }
    },
    [siteOrigin]
  );

  // ------------------------------------------------------------------
  // Toolbar helpers.
  // ------------------------------------------------------------------
  const stepZoom = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const { width, height } = viewport.getBoundingClientRect();
      setCamera({
        x: width / 2 - ((width / 2 - committed.x) / committed.scale) *
          (committed.scale * factor),
        y: height / 2 - ((height / 2 - committed.y) / committed.scale) *
          (committed.scale * factor),
        scale: committed.scale * factor,
      });
    },
    [committed, setCamera, viewportRef]
  );

  const drafts = useDrafts(owner, repo, branch);
  void drafts;
  void copiesVersion;

  const disengage = useCallback(() => setEngagedKey(null), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") disengage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disengage]);

  const mountedSet = useMemo(() => new Set(mountedKeys), [mountedKeys]);

  if (!config) return null;

  return (
    <div className="bg-shell relative h-full w-full overflow-hidden">
      {/* Toolbar */}
      <div
        data-canvas-no-pan
        className="bg-background/95 absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg backdrop-blur"
      >
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link href={repoBase}>
              <ArrowLeft className="size-4" />
              Form view
            </Link>
          }
        />
        <div className="bg-border h-5 w-px" />
        <ButtonGroup>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => stepZoom(1 / 1.25)}
            aria-label="Zoom out"
          >
            <Minus className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="min-w-12 tabular-nums"
            onClick={() => fitBounds(worldBounds, { animate: true })}
            aria-label="Fit all pages"
          >
            {Math.round(committed.scale * 100)}%
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => stepZoom(1.25)}
            aria-label="Zoom in"
          >
            <Plus className="size-3.5" />
          </Button>
        </ButtonGroup>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => fitBounds(worldBounds, { animate: true })}
          aria-label="Fit all"
        >
          <Maximize className="size-3.5" />
        </Button>
        <div className="bg-border h-5 w-px" />
        {globalEntry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSheetOpen(true)}
            disabled={!globalCopy}
          >
            <Settings2 className="size-4" />
            Site settings
          </Button>
        )}
        <Button size="sm" onClick={openPublishDialog}>
          <UploadCloud className="size-4" />
          Publish
          {draftCount > 0 && (
            <span className="bg-primary-foreground/20 ml-1 rounded-full px-1.5 text-xs tabular-nums">
              {draftCount}
            </span>
          )}
        </Button>
      </div>

      {/* Status */}
      {pagesQuery.isLoading && (
        <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Discovering pages…
        </div>
      )}
      {pagesQuery.isError && (
        <div className="text-muted-foreground absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm">
          <Frame className="size-6" />
          {pagesQuery.error instanceof Error
            ? pagesQuery.error.message
            : "Failed to discover pages."}
        </div>
      )}

      {/* Viewport + world */}
      <div
        ref={viewportRef}
        className={cn(
          "canvas-viewport h-full w-full touch-none overscroll-none",
          engagedKey ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
        onClick={() => {
          setSelectedKey(null);
          disengage();
        }}
      >
        <div
          ref={worldRef}
          className="absolute top-0 left-0 will-change-transform"
          style={{ transformOrigin: "0 0" }}
        >
          {pages.map((page) => {
            const rect = rects.get(page.path);
            if (!rect) return null;
            const editSrc = (() => {
              try {
                const url = new URL(page.url);
                url.searchParams.set("cms-preview", "edit");
                return url.href;
              } catch {
                return page.url;
              }
            })();
            const mappedEntry =
              page.entry ??
              candidatesFor(entryMap, page.path).find(
                (entry) => entry.route === page.path
              )?.name;
            return (
              <CanvasFrame
                key={page.path}
                page={page}
                rect={rect}
                mounted={mountedSet.has(page.path)}
                engaged={engagedKey === page.path}
                selected={selectedKey === page.path}
                editSrc={editSrc}
                editHref={
                  mappedEntry ? `${repoBase}/file/${encodeURIComponent(mappedEntry)}` : null
                }
                onSelect={setSelectedKey}
                onEngage={(path) => {
                  setSelectedKey(path);
                  setEngagedKey(path);
                  zoomToFrame(path);
                }}
                onLoad={handleFrameLoad}
                registerFrame={registerFrame}
              />
            );
          })}
        </div>
      </div>

      {/* Iframes must not eat pointer events during pan/zoom gestures, and an
          engaged frame opts out of drag-to-pan entirely. */}
      <style>{`
        [data-panning] iframe { pointer-events: none; }
        .canvas-viewport iframe { pointer-events: ${engagedKey ? "auto" : "none"}; }
      `}</style>

      {globalEntry && globalCopy && (
        <SiteConfigSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          entry={globalEntry}
          values={globalCopy.values}
          onSave={handleSiteConfigSave}
          onLiveChange={handleSiteConfigLiveChange}
        />
      )}
    </div>
  );
}

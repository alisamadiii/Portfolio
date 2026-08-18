"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConfig } from "@/contexts/config-context";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import {
  ExternalLink,
  Frame,
  Image as ImageIcon,
  Link2,
  Loader2,
  Maximize,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Input } from "@workspace/ui/components/input";
import { useMediaLibrary } from "@/components/media/media-library-context";
import { cn } from "@workspace/ui/lib/utils";

import {
  buildEntryMap,
  candidatesFor,
  classifyEditable,
  flattenTextValues,
  getValueAtPath,
  pathWithinBounds,
  resolveFieldEntry,
  schemaFieldAtPath,
  setValueAtPath,
  TEXT_FIELD_TYPES,
  type EntryRoute,
} from "@/lib/canvas-entries";
import {
  assemblePagesDraft,
  buildV2EntryMap,
  SITE_ENTRY,
  type ManifestData,
} from "@/lib/engine/v2";
import {
  parseBridgeMessage,
  postEditable,
  postSet,
  postToFrame,
  type GroupMember,
  type GroupOpMessage,
} from "@/lib/bridge-messages";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDrafts,
} from "@/lib/store/drafts";
import { repoPath } from "@/lib/paths";

import {
  CanvasChrome,
  type CmsOverlayState,
} from "@/components/chrome/canvas-chrome";
import { SeoDialog } from "@/components/canvas/seo-dialog";
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
// A mounted frame can't hold a loading slot forever: if neither the native
// `load` event nor the bridge `ready` fires within this window (slow page,
// X-Frame-Options, 5xx, redirect loop), free the slot so the queue advances.
const FRAME_LOAD_TIMEOUT_MS = 10_000;

type WorkingCopy = {
  entry: EntryRoute;
  sha: string | null;
  values: Record<string, unknown>;
};

export function Canvas() {
  const { config } = useConfig();
  const trpc = useTRPC();
  const { open: openMediaLibrary } = useMediaLibrary();

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const repoBase = repoPath(repo);

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

  // ------------------------------------------------------------------
  // CMS v2: a repo with a cms.json manifest is schema-less — the entry map
  // is built from the manifest + the two content files, with field schemas
  // inferred from the JSON value shapes. Legacy repos keep the .pages.yml
  // path below untouched.
  // ------------------------------------------------------------------
  const manifestQuery = useQuery(
    trpc.cms.manifest.get.queryOptions(
      { owner, repo, branch },
      { enabled: Boolean(owner && repo && branch), staleTime: 60_000 }
    )
  );
  const manifest = (manifestQuery.data ?? null) as ManifestData | null;
  const isV2 = Boolean(manifest);

  const pagesContentQuery = useQuery(
    trpc.cms.entries.getContent.queryOptions(
      { owner, repo, branch, path: manifest?.object.paths.pages ?? "" },
      { enabled: isV2, staleTime: 30_000 }
    )
  );
  const siteContentQuery = useQuery(
    trpc.cms.entries.getContent.queryOptions(
      { owner, repo, branch, path: manifest?.object.paths.site ?? "" },
      { enabled: isV2, staleTime: 30_000 }
    )
  );
  // Committed base content — the overlay persistV2 draft assembly starts from.
  const pagesBaseRef = useRef<Record<string, unknown> | null>(null);

  const entryMap = useMemo(
    () =>
      isV2
        ? buildV2EntryMap(
            manifest,
            (pagesContentQuery.data?.contentObject as Record<
              string,
              unknown
            > | null) ?? null,
            (siteContentQuery.data?.contentObject as Record<
              string,
              unknown
            > | null) ?? null
          )
        : buildEntryMap(config),
    [isV2, manifest, pagesContentQuery.data, siteContentQuery.data, config]
  );

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

  // Watchdog: never let a mounted-but-unloaded frame hold its loading slot past
  // FRAME_LOAD_TIMEOUT_MS. On timeout we mark it loaded (freeing the slot for
  // the next queued frame); if it does finish later the iframe paints over its
  // placeholder anyway. Timers are cleared once a frame loads or unmounts.
  const loadTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  useEffect(() => {
    const timers = loadTimersRef.current;
    for (const key of mountedKeys) {
      if (loadedRef.current.has(key) || timers.has(key)) continue;
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          if (!loadedRef.current.has(key)) handleFrameLoad(key);
        }, FRAME_LOAD_TIMEOUT_MS)
      );
    }
    const mounted = new Set(mountedKeys);
    for (const [key, timer] of timers) {
      if (!mounted.has(key) || loadedRef.current.has(key)) {
        clearTimeout(timer);
        timers.delete(key);
      }
    }
  }, [mountedKeys, loadTick, handleFrameLoad]);

  useEffect(() => {
    const timers = loadTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
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
  // Last `data-cms-field` list each frame reported in `ready` — kept so the
  // editable whitelist can be re-sent once the config/schema finishes loading.
  const frameFieldsRef = useRef<Map<string, string[]>>(new Map());
  // Last group item-counts each frame reported (v2) — the reconcile baseline.
  // Updated to the draft's lengths once a reconcile runs so it never
  // double-applies structural ops.
  const frameGroupsRef = useRef<
    Map<string, Array<{ path: string; count: number }>>
  >(new Map());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [engagedKey, setEngagedKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copiesVersion, setCopiesVersion] = useState(0);
  // Non-text field editors triggered from the canvas (bridge `field-activate`).
  const [linkEditor, setLinkEditor] = useState<{
    framePath: string;
    path: string;
    value: string;
  } | null>(null);
  // Non-leaf field clicked: a popover editing the host field + its tagged
  // descendants, anchored to the host's box inside the frame.
  const [groupEditor, setGroupEditor] = useState<{
    framePath: string;
    path: string;
    members: GroupMember[];
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  // A link clicked in the iframe — shows its destination (never navigates).
  const [linkInfo, setLinkInfo] = useState<{
    framePath: string;
    href: string;
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Prefetch every mapped entry (content + sha) so commits can build drafts.
  // v2 repos skip this — their content arrives via the two getContent queries.
  const legacyRoutes = isV2 ? [] : entryMap.routes;
  const entryQueries = useQueries({
    queries: legacyRoutes.map((entry) =>
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

  // Seed v2 working copies: one per page (a slice of pages.json) + the site
  // entry. A stored draft (whole pages.json) wins over committed content;
  // pages whose draft slice differs from the committed base are marked dirty.
  useEffect(() => {
    if (!isV2 || !manifest) return;
    const pagesData = pagesContentQuery.data;
    const siteData = siteContentQuery.data;
    let changed = false;
    if (pagesData) {
      const base = pagesData.contentObject as Record<string, unknown>;
      pagesBaseRef.current = base;
      const draft = getDraft(owner, repo, branch, manifest.object.paths.pages);
      for (const entry of entryMap.routes) {
        if (entry.name === SITE_ENTRY || copiesRef.current.has(entry.name))
          continue;
        const draftSlice = (
          draft?.values as Record<string, unknown> | undefined
        )?.[entry.name] as Record<string, unknown> | undefined;
        const baseSlice = (base[entry.name] ?? {}) as Record<string, unknown>;
        copiesRef.current.set(entry.name, {
          entry,
          sha: draft?.sha ?? pagesData.sha ?? null,
          values: draftSlice ?? baseSlice,
        });
        if (
          draftSlice &&
          JSON.stringify(draftSlice) !== JSON.stringify(baseSlice)
        ) {
          dirtyRef.current.add(entry.name);
        }
        changed = true;
      }
    }
    if (siteData && !copiesRef.current.has(SITE_ENTRY)) {
      const siteEntry = entryMap.byName.get(SITE_ENTRY);
      if (siteEntry) {
        const draft = getDraft(owner, repo, branch, manifest.object.paths.site);
        copiesRef.current.set(SITE_ENTRY, {
          entry: siteEntry,
          sha: draft?.sha ?? siteData.sha ?? null,
          values:
            (draft?.values as Record<string, unknown> | undefined) ??
            (siteData.contentObject as Record<string, unknown>),
        });
        if (draft) dirtyRef.current.add(SITE_ENTRY);
        changed = true;
      }
    }
    if (changed) setCopiesVersion((version) => version + 1);
  }, [
    isV2,
    manifest,
    pagesContentQuery.data,
    siteContentQuery.data,
    entryMap,
    owner,
    repo,
    branch,
  ]);

  useEffect(() => {
    let changed = false;
    legacyRoutes.forEach((entry, index) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryQueries, legacyRoutes, owner, repo, branch]);

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

  /**
   * Tell one frame which of its tagged fields are editable (and how). Skipped
   * until the config/schema has loaded — sending an empty whitelist too early
   * would make the bridge disarm everything and it would never re-arm (the page
   * only announces `ready` once). Re-sent when `entryMap` becomes available.
   */
  const pushEditableToFrame = useCallback(
    (framePath: string) => {
      if (!siteOrigin) return;
      if (entryMap.routes.length === 0) return; // schema not loaded yet
      const fields = frameFieldsRef.current.get(framePath);
      if (!fields) return; // frame hasn't announced `ready`
      const iframe = framesRef.current.get(framePath);
      if (!iframe?.contentWindow) return;
      postEditable(
        iframe.contentWindow,
        siteOrigin,
        classifyEditable(candidatesFor(entryMap, framePath), fields)
      );
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

  /**
   * Persist an entry's working copy to the drafts store. Legacy: one draft
   * per content file. v2: page entries are slices of the shared pages.json —
   * the draft is the committed base overlaid with every page's current
   * values, saved under the pages.json path; the site entry saves alone.
   * Throws on quota errors (caller handles the toast).
   */
  const persistEntryDraft = useCallback(
    (entry: EntryRoute) => {
      const copy = copiesRef.current.get(entry.name);
      if (!copy) return;
      if (isV2 && manifest && entry.name !== SITE_ENTRY) {
        const pageValues = new Map<string, Record<string, unknown>>();
        for (const route of entryMap.routes) {
          if (route.name === SITE_ENTRY) continue;
          const pageCopy = copiesRef.current.get(route.name);
          if (pageCopy && (dirtyRef.current.has(route.name) || route.name === entry.name))
            pageValues.set(route.name, pageCopy.values);
        }
        const pagesPath = manifest.object.paths.pages;
        saveDraftOrThrow(draftKey(owner, repo, branch, pagesPath), {
          v: 1,
          path: pagesPath,
          schemaName: "$pages",
          sha: copy.sha,
          isNew: false,
          values: assemblePagesDraft(pagesBaseRef.current, pageValues),
          savedAt: Date.now(),
          title: "Pages",
        });
        return;
      }
      saveDraftOrThrow(draftKey(owner, repo, branch, entry.filePath), {
        v: 1,
        path: entry.filePath,
        schemaName: isV2 ? SITE_ENTRY : entry.name,
        sha: copy.sha,
        isNew: false,
        values: copy.values,
        savedAt: Date.now(),
        ...(isV2 ? { title: "Site settings" } : {}),
      });
    },
    [isV2, manifest, entryMap, owner, repo, branch]
  );

  const commitEdit = useCallback(
    (framePath: string, fieldPath: string, rawValue: string) => {
      const candidates = candidatesFor(entryMap, framePath);
      const resolved = resolveFieldEntry(candidates, fieldPath);
      // No CMS field maps here — the element was tagged but isn't in the schema.
      // The bridge no longer arms these, so a commit shouldn't reach us; ignore
      // silently if it does (no toast — this is not the user's problem to fix).
      if (!resolved) return;
      const { entry, field } = resolved;
      // Text types edit inline; images carry a URL string from the media picker.
      if (!TEXT_FIELD_TYPES.has(field.type) && field.type !== "image") {
        toast.info("This element isn't text-editable yet — use the form view.");
        return;
      }
      const copy = copiesRef.current.get(entry.name);
      if (!copy) {
        toast.error("Entry content is still loading — try again in a moment.");
        return;
      }
      // A blur that raced a group remove can commit a now-out-of-bounds index
      // — writing it would resurrect the deleted item as a sparse array slot.
      if (!pathWithinBounds(copy.values, fieldPath)) return;
      let value: string | number = rawValue;
      if (field.type === "number") {
        // The on-screen text can carry a suffix / thousands separators (e.g. an
        // animated "1,200+"), so strip everything but digits/sign/decimal.
        // Never store NaN — it corrupts the JSON and the draft.
        const cleaned = rawValue.replace(/[^0-9.-]/g, "");
        const parsed = Number(cleaned);
        if (cleaned === "" || Number.isNaN(parsed)) {
          toast.error("Enter a valid number.");
          return;
        }
        value = parsed;
      }
      copy.values = setValueAtPath(copy.values, fieldPath, value);
      dirtyRef.current.add(entry.name);
      try {
        persistEntryDraft(entry);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft."
        );
        return;
      }
      setCopiesVersion((version) => version + 1);
      propagate(entry.name, fieldPath, String(value), framePath);
    },
    [entryMap, persistEntryDraft, propagate]
  );

  /**
   * A `<Group>` structural edit request from a frame. Hub-authoritative: the
   * draft array is spliced here, then the frame (and every other frame
   * showing the entry) gets a `group-apply` telling it how to mutate its DOM
   * plus the flattened values to repaint with. On failure the frame gets
   * `ok: false` and leaves its DOM untouched.
   */
  const handleGroupOp = useCallback(
    (framePath: string, msg: GroupOpMessage) => {
      if (!siteOrigin) return;
      const iframe = framesRef.current.get(framePath);
      const reply = (
        ok: boolean,
        values?: Array<{ path: string; value: string }>
      ) =>
        postToFrame(iframe?.contentWindow, siteOrigin, {
          type: "group-apply",
          ok,
          path: msg.path,
          op: msg.op,
          index: msg.index,
          toIndex: msg.toIndex,
          values,
        });

      const candidates = candidatesFor(entryMap, framePath);
      const resolved = resolveFieldEntry(candidates, msg.path);
      if (!resolved) return reply(false);
      const copy = copiesRef.current.get(resolved.entry.name);
      if (!copy) return reply(false);
      const current = getValueAtPath(copy.values, msg.path);
      if (!Array.isArray(current)) return reply(false);

      const next = [...current];
      if (msg.op === "add") {
        // Duplicate semantics: clone the clicked item (always template-safe).
        const sourceIndex = Math.min(Math.max(msg.index, 0), next.length - 1);
        const template = next[sourceIndex];
        if (template === undefined) return reply(false);
        next.splice(sourceIndex + 1, 0, structuredClone(template));
      } else if (msg.op === "remove") {
        if (msg.index < 0 || msg.index >= next.length) return reply(false);
        next.splice(msg.index, 1);
      } else if (msg.op === "move") {
        const to = msg.toIndex;
        if (
          typeof to !== "number" ||
          msg.index < 0 ||
          msg.index >= next.length ||
          to < 0 ||
          to >= next.length
        )
          return reply(false);
        const [moved] = next.splice(msg.index, 1);
        next.splice(to, 0, moved!);
      } else {
        return reply(false);
      }

      copy.values = setValueAtPath(copy.values, msg.path, next);
      dirtyRef.current.add(resolved.entry.name);
      try {
        persistEntryDraft(resolved.entry);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft."
        );
        return reply(false);
      }
      setCopiesVersion((version) => version + 1);

      const values = flattenTextValues(next, msg.path);
      reply(true, values);
      // Same structural op to every other mounted frame showing this entry.
      for (const [otherPath, otherFrame] of framesRef.current) {
        if (otherPath === framePath || !otherFrame.contentWindow) continue;
        const shows = candidatesFor(entryMap, otherPath).some(
          (candidate) => candidate.name === resolved.entry.name
        );
        if (shows) {
          postToFrame(otherFrame.contentWindow, siteOrigin, {
            type: "group-apply",
            ok: true,
            path: msg.path,
            op: msg.op,
            index: msg.index,
            toIndex: msg.toIndex,
            values,
          });
        }
      }
      // Keep the reconcile baselines in sync with the new array length.
      for (const [path, groups] of frameGroupsRef.current) {
        void path;
        for (const group of groups) {
          if (group.path === msg.path) group.count = next.length;
        }
      }
    },
    [entryMap, siteOrigin, persistEntryDraft]
  );

  /**
   * Structural draft replay: a freshly loaded iframe renders the COMMITTED
   * item count — if a draft's array is longer/shorter, tell the frame to
   * clone/remove items (`group-apply`) BEFORE the value flood, or added items
   * would silently vanish on frame reload. Baseline counts come from the
   * frame's `ready`; they're bumped to the draft lengths after each run so a
   * repeat (e.g. once copies finish seeding) never double-applies.
   */
  const reconcileFrameGroups = useCallback(
    (framePath: string) => {
      if (!siteOrigin) return;
      const iframe = framesRef.current.get(framePath);
      if (!iframe?.contentWindow) return;
      const groups = frameGroupsRef.current.get(framePath);
      if (!groups?.length) return;
      const candidates = candidatesFor(entryMap, framePath);
      for (const group of groups) {
        const resolved = resolveFieldEntry(candidates, group.path);
        if (!resolved) continue;
        const copy = copiesRef.current.get(resolved.entry.name);
        if (!copy || !dirtyRef.current.has(resolved.entry.name)) continue;
        const draftArray = getValueAtPath(copy.values, group.path);
        if (!Array.isArray(draftArray) || draftArray.length === group.count)
          continue;
        const values = flattenTextValues(draftArray, group.path);
        if (draftArray.length > group.count) {
          for (let i = group.count; i < draftArray.length; i++) {
            postToFrame(iframe.contentWindow, siteOrigin, {
              type: "group-apply",
              ok: true,
              path: group.path,
              op: "add",
              index: Math.max(0, i - 1),
              values,
            });
          }
        } else {
          for (let i = group.count - 1; i >= draftArray.length; i--) {
            postToFrame(iframe.contentWindow, siteOrigin, {
              type: "group-apply",
              ok: true,
              path: group.path,
              op: "remove",
              index: i,
              values,
            });
          }
        }
        group.count = draftArray.length;
      }
    },
    [entryMap, siteOrigin]
  );

  /** Write a non-text field value (media URL / link href) and reflect it live. */
  const commitNonText = useCallback(
    (framePath: string, fieldPath: string, value: string) => {
      commitEdit(framePath, fieldPath, value);
      // Unlike inline text, the source frame didn't mutate itself — push the
      // new src/href back to it too (propagate already covers the others).
      const iframe = framesRef.current.get(framePath);
      if (iframe?.contentWindow && siteOrigin) {
        postSet(iframe.contentWindow, siteOrigin, [{ path: fieldPath, value }]);
      }
    },
    [commitEdit, siteOrigin]
  );

  /** Open the matching editor when a page reports a non-text field click. */
  const activateField = useCallback(
    (
      framePath: string,
      path: string,
      kind: "media" | "link" | "group",
      value: string,
      members?: GroupMember[],
      rect?: { x: number; y: number; width: number; height: number }
    ) => {
      if (kind === "group") {
        setGroupEditor({
          framePath,
          path,
          members: members ?? [{ path, kind: "text" }],
          rect: rect ?? { x: 0, y: 0, width: 0, height: 0 },
        });
      } else if (kind === "media") {
        openMediaLibrary({
          title: "Replace image",
          onInsert: (urls) => {
            const url = urls[0];
            if (url) commitNonText(framePath, path, url);
          },
        });
      } else {
        setLinkEditor({ framePath, path, value });
      }
    },
    [openMediaLibrary, commitNonText]
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
        case "ready": {
          handleFrameLoad(framePath);
          // Structure BEFORE values: reconcile draft array lengths against the
          // rendered item counts first, then flood the draft values.
          if (msg.v >= 2 && msg.groups?.length) {
            frameGroupsRef.current.set(
              framePath,
              msg.groups.map((group) => ({ ...group }))
            );
            reconcileFrameGroups(framePath);
          }
          pushDraftsToFrame(framePath);
          // Remember what the page reported, then tell it which of those fields
          // are actually editable (and how). Held so it can be re-sent once the
          // schema loads if `ready` beat it. The bridge also posts a legacy v1
          // `cms-preview-ready` (normalized to a ready with empty `fields`)
          // right after the v2 one — skip it, or it would overwrite the real
          // field list and push an empty whitelist that disarms the page.
          if (msg.v >= 2) {
            frameFieldsRef.current.set(framePath, msg.fields);
            pushEditableToFrame(framePath);
          }
          break;
        }
        case "field-commit":
          commitEdit(framePath, msg.path, msg.value);
          break;
        case "group-op":
          handleGroupOp(framePath, msg);
          break;
        case "field-activate":
          activateField(
            framePath,
            msg.path,
            msg.kind,
            msg.value ?? "",
            msg.members,
            msg.rect
          );
          break;
        case "link-info":
          setLinkInfo({ framePath, href: msg.href, rect: msg.rect });
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    siteOrigin,
    commitEdit,
    activateField,
    pushDraftsToFrame,
    pushEditableToFrame,
    handleFrameLoad,
    handleGroupOp,
    reconcileFrameGroups,
  ]);

  // Copies can finish seeding AFTER a frame announced `ready` (queries still
  // loading) — re-run the structural reconcile + draft push then. Baseline
  // counts were bumped on the first pass, so this never double-applies, and
  // repeated `set` floods are idempotent (applySet skips the caret host).
  useEffect(() => {
    for (const framePath of frameFieldsRef.current.keys()) {
      reconcileFrameGroups(framePath);
      pushDraftsToFrame(framePath);
    }
  }, [copiesVersion, reconcileFrameGroups, pushDraftsToFrame]);

  // Config/schema can finish loading after a frame already announced `ready`
  // (which sent no whitelist yet, or an incomplete one). Re-send to every frame
  // that has reported its fields whenever the resolved entry map changes.
  useEffect(() => {
    for (const framePath of frameFieldsRef.current.keys()) {
      pushEditableToFrame(framePath);
    }
  }, [pushEditableToFrame]);

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
        persistEntryDraft(globalEntry);
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
    [globalEntry, persistEntryDraft, siteOrigin]
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
  // Per-page SEO editing (frame title-bar button → dialog on `seo`).
  // ------------------------------------------------------------------
  const [seoEditor, setSeoEditor] = useState<string | null>(null);
  const [cmsOverlay, setCmsOverlay] = useState<CmsOverlayState>({
    open: false,
  });

  /** Route entry (not globals) whose schema owns this page — for SEO. */
  const seoEntryFor = useCallback(
    (pagePath: string, entryName?: string) => {
      const entry = entryName
        ? entryMap.byName.get(entryName)
        : entryMap.routes.find((candidate) => candidate.route === pagePath);
      if (!entry) return null;
      const seoField = schemaFieldAtPath(entry.schema.fields, "seo");
      if (!seoField || seoField.type !== "object" || seoField.list === true)
        return null;
      return { entry, seoField };
    },
    [entryMap]
  );

  const handleSeoSave = useCallback(
    (entryName: string, seoValues: Record<string, unknown>) => {
      const entry = entryMap.byName.get(entryName);
      const copy = copiesRef.current.get(entryName);
      if (!entry || !copy) return;
      copy.values = setValueAtPath(copy.values, "seo", seoValues);
      dirtyRef.current.add(entryName);
      try {
        persistEntryDraft(entry);
        toast.success("Draft saved on this device");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft."
        );
        return;
      }
      setCopiesVersion((version) => version + 1);
    },
    [entryMap, persistEntryDraft]
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
      {/* Floating chrome: repo menu / CMS / admin / search / publish */}
      <CanvasChrome
        onOpenSiteSettings={globalEntry ? () => setSheetOpen(true) : undefined}
        siteSettingsReady={Boolean(globalEntry && globalCopy)}
        cms={cmsOverlay}
        onCmsChange={setCmsOverlay}
      />

      {/* Zoom pill */}
      <div
        data-canvas-no-pan
        className="bg-background/95 absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg backdrop-blur"
      >
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
          "canvas-viewport h-full w-full touch-none overscroll-none select-none",
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
            // v2 repos have no form editor — the canvas is the only editing
            // surface for pages (collections keep their table).
            const editHref =
              page.kind === "collection" && page.collection
                ? `${repoBase}/collection/${encodeURIComponent(page.collection)}`
                : !isV2 && mappedEntry
                  ? `${repoBase}/file/${encodeURIComponent(mappedEntry)}`
                  : null;
            const seoInfo =
              page.kind === "collection"
                ? null
                : seoEntryFor(page.path, mappedEntry);
            return (
              <CanvasFrame
                key={page.path}
                page={page}
                rect={rect}
                mounted={mountedSet.has(page.path)}
                engaged={engagedKey === page.path}
                selected={selectedKey === page.path}
                editSrc={editSrc}
                editHref={editHref}
                seoAvailable={Boolean(
                  seoInfo && copiesRef.current.has(seoInfo.entry.name)
                )}
                onOpenSeo={setSeoEditor}
                onOpenCollection={(collection) =>
                  setCmsOverlay({ open: true, collection })
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

          {/* Group-field popover — anchored to the clicked non-leaf element.
              Lives in the world layer so it pans/zooms with its frame; the
              inner card counter-scales to stay a constant on-screen size. */}
          {groupEditor &&
            (() => {
              const frameRect = rects.get(groupEditor.framePath);
              if (!frameRect) return null;
              const candidates = candidatesFor(entryMap, groupEditor.framePath);
              const valueByPath = new Map<string, string>();
              for (const entry of candidates) {
                const copy = copiesRef.current.get(entry.name);
                if (copy)
                  for (const { path, value } of flattenTextValues(copy.values))
                    valueByPath.set(path, value);
              }
              // Build one row per editable scalar field in the cluster.
              const isScalar = (f: Record<string, any>) =>
                TEXT_FIELD_TYPES.has(f.type) || f.type === "image";
              const kindOf = (f: Record<string, any>): GroupMember["kind"] =>
                f.type === "image"
                  ? "media"
                  : f.type === "string" && f.options?.type === "url"
                    ? "link"
                    : "text";
              const rows = new Map<
                string,
                { kind: GroupMember["kind"]; label: string }
              >();
              const addField = (
                path: string,
                field: Record<string, any> | undefined
              ) => {
                if (!field || !isScalar(field) || rows.has(path)) return;
                rows.set(path, {
                  kind: kindOf(field),
                  label: String(
                    field.label ?? field.name ?? path.split(".").pop() ?? path
                  ),
                });
              };
              // 1. Every scalar child of an object host — surfaces fields that
              //    never got a `data-cms-field` in the markup (e.g. a stat's
              //    `suffix`, baked into a countup script).
              const hostField = resolveFieldEntry(
                candidates,
                groupEditor.path
              )?.field;
              if (Array.isArray(hostField?.fields))
                for (const child of hostField.fields)
                  addField(`${groupEditor.path}.${child.name}`, child);
              // 2. Plus any tagged members the bridge reported — covers a scalar
              //    host that wraps tagged siblings (a heading + its highlight).
              for (const member of groupEditor.members)
                addField(
                  member.path,
                  resolveFieldEntry(candidates, member.path)?.field
                );
              const seeded = Array.from(rows, ([path, meta]) => {
                const raw = valueByPath.get(path) ?? "";
                return {
                  path,
                  kind: meta.kind,
                  label: meta.label,
                  // A previously-corrupted number draft flattens to "NaN" —
                  // show it blank so the user can just type the value.
                  value: raw === "NaN" ? "" : raw,
                };
              });
              if (seeded.length === 0) return null;
              return (
                <FrameAnchored
                  frameRect={frameRect}
                  rect={groupEditor.rect}
                  scale={committed.scale}
                >
                  <GroupEditor
                    key={`${groupEditor.framePath}:${groupEditor.path}`}
                    members={seeded}
                    onCommit={(path, value) =>
                      commitNonText(groupEditor.framePath, path, value)
                    }
                    onClose={() => setGroupEditor(null)}
                  />
                </FrameAnchored>
              );
            })()}

          {/* Link destination popover — a link was clicked in edit mode; the
              iframe never navigates, we just show where it points. */}
          {linkInfo &&
            (() => {
              const frameRect = rects.get(linkInfo.framePath);
              if (!frameRect) return null;
              return (
                <FrameAnchored
                  frameRect={frameRect}
                  rect={linkInfo.rect}
                  scale={committed.scale}
                >
                  <LinkInfoPopover
                    key={`${linkInfo.framePath}:${linkInfo.href}`}
                    href={linkInfo.href}
                    onOpen={() => {
                      try {
                        const url = new URL(
                          linkInfo.href || "/",
                          siteOrigin ?? undefined
                        ).href;
                        window.open(url, "_blank", "noopener");
                      } catch {
                        /* malformed href — nothing to open */
                      }
                    }}
                    onClose={() => setLinkInfo(null)}
                  />
                </FrameAnchored>
              );
            })()}
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

      {/* Per-page SEO dialog */}
      {seoEditor &&
        (() => {
          const page = pages.find(
            (candidate) => candidate.path === seoEditor
          );
          if (!page) return null;
          const mappedEntry =
            page.entry ??
            candidatesFor(entryMap, page.path).find(
              (entry) => entry.route === page.path
            )?.name;
          const info = seoEntryFor(page.path, mappedEntry);
          const copy = info ? copiesRef.current.get(info.entry.name) : null;
          if (!info || !copy) return null;
          const seoValues =
            (copy.values.seo as Record<string, unknown> | undefined) ?? {};
          return (
            <SeoDialog
              key={page.path}
              open
              onOpenChange={(next) => {
                if (!next) setSeoEditor(null);
              }}
              pageTitle={page.title}
              fields={(info.seoField.fields ?? []) as any}
              values={seoValues}
              onSave={(values) => handleSeoSave(info.entry.name, values)}
            />
          );
        })()}

      {/* Link URL editor — opened when a link is clicked/focused on a page. */}
      {linkEditor && (
        <LinkEditor
          key={`${linkEditor.framePath}:${linkEditor.path}`}
          value={linkEditor.value}
          onSave={(url) => {
            commitNonText(linkEditor.framePath, linkEditor.path, url);
            setLinkEditor(null);
          }}
          onCancel={() => setLinkEditor(null)}
        />
      )}
    </div>
  );
}

/**
 * Floating URL editor for a link. Anchored bottom-center of the canvas (the
 * link lives inside an iframe, so there's no DOM element to attach a popover
 * to). Enter saves, Escape cancels.
 */
function LinkEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <div className="bg-background fixed bottom-6 left-1/2 z-50 flex w-[min(28rem,90vw)] -translate-x-1/2 items-center gap-2 rounded-xl border p-2 shadow-xl">
      <Link2 className="text-muted-foreground ml-1 size-4 shrink-0" />
      <Input
        ref={inputRef}
        value={url}
        placeholder="https://…"
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSave(url.trim());
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="h-8 flex-1"
      />
      <Button size="sm" onClick={() => onSave(url.trim())}>
        Save
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onCancel}
        aria-label="Cancel"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

type GroupEditorMember = GroupMember & { label: string; value: string };

/**
 * Popover for a non-leaf field: edits the host field plus each tagged
 * descendant. Text/link rows edit inline (Enter or blur commits); an image row
 * opens the global media dialog. Anchored by the caller; Escape closes it
 * (capture phase, so the canvas's own Escape doesn't disengage the frame).
 */
function GroupEditor({
  members,
  onCommit,
  onClose,
}: {
  members: GroupEditorMember[];
  onCommit: (path: string, value: string) => void;
  onClose: () => void;
}) {
  const { open: openMediaLibrary } = useMediaLibrary();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);
  return (
    <div className="bg-background w-80 rounded-xl border p-3 shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium">
          Edit fields
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {members.map((member) =>
          member.kind === "media" ? (
            <div key={member.path} className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                {member.label}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  openMediaLibrary({
                    title: "Replace image",
                    onInsert: (urls) => {
                      const url = urls[0];
                      if (url) onCommit(member.path, url);
                    },
                  })
                }
              >
                <ImageIcon className="size-4" />
                Replace image
              </Button>
            </div>
          ) : (
            <GroupEditorRow
              key={member.path}
              label={member.label}
              value={member.value}
              onCommit={(value) => onCommit(member.path, value)}
            />
          )
        )}
      </div>
    </div>
  );
}

/** One text/link row inside the group popover — commits on Enter or blur. */
function GroupEditorRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Re-seed if the underlying draft changes (e.g. propagated from inline edit).
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            (event.target as HTMLInputElement).blur();
          }
        }}
        className="h-8"
      />
    </label>
  );
}

/**
 * Anchors a popover to an element inside a frame. Rendered in the world layer
 * (so it pans/zooms with the frame) at the frame's world position + the
 * element's iframe-space box, then counter-scaled so the card stays a constant
 * on-screen size. `data-canvas-no-pan` + stopPropagation keep interaction from
 * panning or disengaging the frame.
 */
function FrameAnchored({
  frameRect,
  rect,
  scale,
  children,
}: {
  frameRect: { x: number; y: number };
  rect: { x: number; y: number; width: number; height: number };
  scale: number;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute z-40"
      data-canvas-no-pan
      onClick={(event) => event.stopPropagation()}
      style={{ left: frameRect.x + rect.x, top: frameRect.y + rect.y + rect.height }}
    >
      <div style={{ transform: `scale(${1 / scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

/** Read-only popover showing a clicked link's destination, with open-in-new-tab. */
function LinkInfoPopover({
  href,
  onOpen,
  onClose,
}: {
  href: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);
  return (
    <div className="bg-background w-72 rounded-xl border p-3 shadow-2xl">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-muted-foreground min-w-0 flex-1 text-xs font-medium">
          Links to
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <p className="mb-2 truncate text-sm font-medium" title={href}>
        {href || "(no href)"}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onOpen}
      >
        <ExternalLink className="size-4" />
        Open in new tab
      </Button>
    </div>
  );
}

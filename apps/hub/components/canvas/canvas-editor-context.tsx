"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConfig } from "@/contexts/config-context";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { toast } from "sonner";

import { useMediaLibrary } from "@/components/media/media-library-context";

import {
  buildEntryMap,
  candidatesFor,
  classifyEditable,
  flattenTextValues,
  getValueAtPath,
  pathWithinBounds,
  resolveFieldEntry,
  setValueAtPath,
  TEXT_FIELD_TYPES,
  type CanvasEntryMap,
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

/** Controlled state for the full-screen CMS entry-management overlay. */
export type CmsOverlayState = { open: boolean; collection?: string };

/**
 * Headless editing engine for the single-page editor. This is the edit
 * controller lifted verbatim out of the old pan/zoom `Canvas`: it owns the
 * content queries, working copies, drafts, and the whole cms-bridge
 * postMessage protocol. The new shell renders ONE iframe (`PageFrame`) that
 * registers here, so all of this reuses the battle-tested logic unchanged —
 * only the camera/culling/multi-frame layout was dropped.
 */

export type CanvasPageInfo = {
  path: string;
  url: string;
  title: string;
  entry?: string;
  kind?: "page" | "collection";
  collection?: string;
  parentPath?: string;
};

type WorkingCopy = {
  entry: EntryRoute;
  sha: string | null;
  values: Record<string, unknown>;
};

type LinkEditorState = {
  framePath: string;
  path: string;
  value: string;
} | null;

type GroupEditorState = {
  framePath: string;
  path: string;
  members: GroupMember[];
  rect: { x: number; y: number; width: number; height: number };
} | null;

type CanvasEditorValue = {
  owner: string;
  repo: string;
  branch: string;
  repoBase: string;
  pages: CanvasPageInfo[];
  siteOrigin: string | null;
  pagesLoading: boolean;
  pagesError: Error | null;
  isV2: boolean;
  manifest: ManifestData | null;
  entryMap: CanvasEntryMap;
  copiesVersion: number;
  /** Page paths with unpublished edits (route-matched entries only). */
  dirtyPagePaths: Set<string>;

  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;

  registerFrame: (path: string, iframe: HTMLIFrameElement | null) => void;
  editSrcFor: (url: string) => string;
  refreshFrameFromStore: (framePath: string) => void;

  copiesRef: React.MutableRefObject<Map<string, WorkingCopy>>;

  // Non-text field editors (link / group popovers).
  linkEditor: LinkEditorState;
  setLinkEditor: (state: LinkEditorState) => void;
  groupEditor: GroupEditorState;
  setGroupEditor: (state: GroupEditorState) => void;
  commitNonText: (framePath: string, fieldPath: string, value: string) => void;

  // CMS overlay (opened from the header + page-tree collection rows).
  cmsOverlay: CmsOverlayState;
  setCmsOverlay: (state: CmsOverlayState) => void;

  // Site (global) settings — consumed by the Settings mode site panel.
  globalEntry: EntryRoute | null;
  getGlobalValues: () => Record<string, unknown> | null;
  handleSiteConfigSave: (values: Record<string, unknown>) => void;
  handleSiteConfigLiveChange: (values: Record<string, unknown>) => void;
};

const CanvasEditorContext = createContext<CanvasEditorValue | null>(null);

export function useCanvasEditor(): CanvasEditorValue {
  const ctx = useContext(CanvasEditorContext);
  if (!ctx)
    throw new Error("useCanvasEditor must be used within CanvasEditorProvider");
  return ctx;
}

export function CanvasEditorProvider({ children }: { children: ReactNode }) {
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

  // Which page's iframe is currently shown. Defaults to the first page.
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  useEffect(() => {
    if (selectedPath && pages.some((page) => page.path === selectedPath)) return;
    const firstPage = pages.find((page) => page.kind !== "collection");
    setSelectedPath(firstPage?.path ?? pages[0]?.path ?? null);
  }, [pages, selectedPath]);

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
      { owner, repo, branch, path: manifest?.object.paths.variables ?? "" },
      { enabled: isV2, staleTime: 30_000 }
    )
  );
  // Committed base content — the persistV2 draft assembly starts from.
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
  // Edit controller: iframe messages → entry resolution → drafts.
  // ------------------------------------------------------------------
  const framesRef = useRef<Map<string, HTMLIFrameElement>>(new Map());
  // Last `data-cms-field` list each frame reported in `ready` — kept so the
  // editable whitelist can be re-sent once the config/schema finishes loading.
  const frameFieldsRef = useRef<Map<string, string[]>>(new Map());
  // Last group item-counts each frame reported (v2) — the reconcile baseline.
  const frameGroupsRef = useRef<
    Map<string, Array<{ path: string; count: number }>>
  >(new Map());

  const registerFrame = useCallback(
    (path: string, iframe: HTMLIFrameElement | null) => {
      if (iframe) {
        framesRef.current.set(path, iframe);
      } else {
        framesRef.current.delete(path);
        // The single iframe genuinely unmounts on every page switch — clear
        // this frame's reported field/group baselines so a stale editable
        // whitelist or reconcile baseline never leaks into the next page.
        frameFieldsRef.current.delete(path);
        frameGroupsRef.current.delete(path);
      }
    },
    []
  );

  const copiesRef = useRef<Map<string, WorkingCopy>>(new Map());
  const dirtyRef = useRef<Set<string>>(new Set());
  const [copiesVersion, setCopiesVersion] = useState(0);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState>(null);
  const [groupEditor, setGroupEditor] = useState<GroupEditorState>(null);
  const [cmsOverlay, setCmsOverlay] = useState<CmsOverlayState>({ open: false });

  // Prefetch every mapped entry (content + sha) so commits can build drafts.
  // v2 repos skip this — their content arrives via the two getContent queries.
  const legacyRoutes = isV2 ? [] : entryMap.routes;
  const entryQueries = useQueries({
    queries: legacyRoutes.map((entry) =>
      trpc.cms.entries.get.queryOptions(
        { owner, repo, branch, path: entry.filePath, name: entry.name },
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
        const draft = getDraft(
          owner,
          repo,
          branch,
          manifest.object.paths.variables
        );
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
      if (
        !data ||
        !("contentObject" in data) ||
        copiesRef.current.has(entry.name)
      )
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
   * Re-seed a frame's working copy from localStorage (the source of truth),
   * dropping stale in-memory edits. Called by the Refresh button before the
   * iframe reloads. V2 pages only (legacy frames just reload).
   */
  const refreshFrameFromStore = useCallback(
    (framePath: string) => {
      if (!isV2 || !manifest) return;
      const base = pagesBaseRef.current;
      if (!base) return;
      const draft = getDraft(owner, repo, branch, manifest.object.paths.pages);
      const draftValues = draft?.values as Record<string, unknown> | undefined;
      let changed = false;
      for (const entry of candidatesFor(entryMap, framePath)) {
        if (entry.name === SITE_ENTRY) continue;
        const draftSlice = draftValues?.[entry.name] as
          | Record<string, unknown>
          | undefined;
        const baseSlice = (base[entry.name] ?? {}) as Record<string, unknown>;
        const prev = copiesRef.current.get(entry.name);
        copiesRef.current.set(entry.name, {
          entry,
          sha: draft?.sha ?? prev?.sha ?? null,
          values: draftSlice ?? baseSlice,
        });
        if (
          draftSlice &&
          JSON.stringify(draftSlice) !== JSON.stringify(baseSlice)
        ) {
          dirtyRef.current.add(entry.name);
        } else {
          dirtyRef.current.delete(entry.name);
        }
        changed = true;
      }
      if (changed) setCopiesVersion((version) => version + 1);
    },
    [isV2, manifest, owner, repo, branch, entryMap]
  );

  /**
   * Tell one frame which of its tagged fields are editable (and how). Skipped
   * until the config/schema has loaded — sending an empty whitelist too early
   * would make the bridge disarm everything and it would never re-arm.
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
   * per content file. v2: page entries are slices of the shared pages.json.
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
          if (
            pageCopy &&
            (dirtyRef.current.has(route.name) || route.name === entry.name)
          )
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
        ...(isV2 ? { title: "Variables" } : {}),
      });
    },
    [isV2, manifest, entryMap, owner, repo, branch]
  );

  const commitEdit = useCallback(
    (framePath: string, fieldPath: string, rawValue: string) => {
      const candidates = candidatesFor(entryMap, framePath);
      const resolved = resolveFieldEntry(candidates, fieldPath);
      if (!resolved) return;
      const { entry, field } = resolved;
      if (!TEXT_FIELD_TYPES.has(field.type) && field.type !== "image") {
        toast.info("This element isn't text-editable yet — use the form view.");
        return;
      }
      const copy = copiesRef.current.get(entry.name);
      if (!copy) {
        toast.error("Entry content is still loading — try again in a moment.");
        return;
      }
      if (!pathWithinBounds(copy.values, fieldPath)) return;
      let value: string | number = rawValue;
      if (field.type === "number") {
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
      for (const [path, groups] of frameGroupsRef.current) {
        void path;
        for (const group of groups) {
          if (group.path === msg.path) group.count = next.length;
        }
      }
    },
    [entryMap, siteOrigin, persistEntryDraft]
  );

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

  // Single window-level message listener; frames identified by event.source.
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
          if (msg.v >= 2 && msg.groups?.length) {
            frameGroupsRef.current.set(
              framePath,
              msg.groups.map((group) => ({ ...group }))
            );
            reconcileFrameGroups(framePath);
          }
          pushDraftsToFrame(framePath);
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
        case "collection-open":
          setCmsOverlay({ open: true, collection: msg.collection });
          break;
        case "link-info": {
          const href = msg.href;
          toast(`Links to ${href || "(no href)"}`, {
            action: {
              label: "Open in new tab",
              onClick: () => {
                try {
                  const url = new URL(href || "/", siteOrigin ?? undefined).href;
                  window.open(url, "_blank", "noopener");
                } catch {
                  /* malformed href — nothing to open */
                }
              },
            },
          });
          break;
        }
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
    handleGroupOp,
    reconcileFrameGroups,
  ]);

  // Copies can finish seeding AFTER a frame announced `ready` — re-run the
  // structural reconcile + draft push then (baselines already bumped, so no
  // double-apply; repeated `set` floods are idempotent).
  useEffect(() => {
    for (const framePath of frameFieldsRef.current.keys()) {
      reconcileFrameGroups(framePath);
      pushDraftsToFrame(framePath);
    }
  }, [copiesVersion, reconcileFrameGroups, pushDraftsToFrame]);

  // Config/schema can finish loading after a frame already announced `ready`.
  // Re-send the editable whitelist to every frame that reported its fields.
  useEffect(() => {
    for (const framePath of frameFieldsRef.current.keys()) {
      pushEditableToFrame(framePath);
    }
  }, [pushEditableToFrame]);

  // ------------------------------------------------------------------
  // Site config (global entry, e.g. `site`) — used by Settings mode.
  // ------------------------------------------------------------------
  const globalEntry = entryMap.globals.length
    ? (entryMap.byName.get(entryMap.globals[0]!) ?? null)
    : null;

  const getGlobalValues = useCallback(() => {
    if (!globalEntry) return null;
    return copiesRef.current.get(globalEntry.name)?.values ?? null;
  }, [globalEntry]);

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

  const editSrcFor = useCallback((url: string) => {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("cms-preview", "edit");
      return parsed.href;
    } catch {
      return url;
    }
  }, []);

  // Subscribe to the drafts store so publish/refresh stay in sync.
  const drafts = useDrafts(owner, repo, branch);
  void drafts;
  void copiesVersion;

  // Page paths carrying unpublished edits — used for the page-tree draft dots.
  // Globals (site header/footer) are excluded so a site-wide edit doesn't light
  // up every page; only route-matched entries count toward a page's dot.
  const dirtyPagePaths = useMemo(() => {
    const globalSet = new Set(entryMap.globals);
    const result = new Set<string>();
    for (const page of pages) {
      if (page.kind === "collection") continue;
      const dirty = candidatesFor(entryMap, page.path).some(
        (entry) =>
          !globalSet.has(entry.name) && dirtyRef.current.has(entry.name)
      );
      if (dirty) result.add(page.path);
    }
    return result;
    // dirtyRef is a ref; copiesVersion bumps whenever it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, entryMap, copiesVersion]);

  const value = useMemo<CanvasEditorValue>(
    () => ({
      owner,
      repo,
      branch,
      repoBase,
      pages,
      siteOrigin,
      pagesLoading: pagesQuery.isLoading,
      pagesError:
        pagesQuery.error instanceof Error ? pagesQuery.error : null,
      isV2,
      manifest,
      entryMap,
      copiesVersion,
      dirtyPagePaths,
      selectedPath,
      setSelectedPath,
      registerFrame,
      editSrcFor,
      refreshFrameFromStore,
      copiesRef,
      linkEditor,
      setLinkEditor,
      groupEditor,
      setGroupEditor,
      commitNonText,
      cmsOverlay,
      setCmsOverlay,
      globalEntry,
      getGlobalValues,
      handleSiteConfigSave,
      handleSiteConfigLiveChange,
    }),
    [
      owner,
      repo,
      branch,
      repoBase,
      pages,
      siteOrigin,
      pagesQuery.isLoading,
      pagesQuery.error,
      isV2,
      manifest,
      entryMap,
      copiesVersion,
      dirtyPagePaths,
      selectedPath,
      registerFrame,
      editSrcFor,
      refreshFrameFromStore,
      linkEditor,
      groupEditor,
      commitNonText,
      cmsOverlay,
      globalEntry,
      getGlobalValues,
      handleSiteConfigSave,
      handleSiteConfigLiveChange,
    ]
  );

  return (
    <CanvasEditorContext.Provider value={value}>
      {children}
    </CanvasEditorContext.Provider>
  );
}

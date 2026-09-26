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
import { useRepo } from "@/contexts/repo-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { roleAtLeast } from "@/lib/authz-shared";
import { toast } from "sonner";

import { useMediaLibrary } from "@/components/media/media-library-context";

import {
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
  useDraftsStore,
} from "@/lib/store/drafts";
import { repoPath } from "@/lib/paths";
import { inferFields } from "@/lib/engine/infer";
import { entryHasChanges } from "@/lib/entry-diff";
import type { Field } from "@workspace/cms-core/types/field";

// The URL param the cms-bridge overlay watches to turn edit mode on. Must match
// EDIT_PARAM in the bridge client (packages/cms-bridge/src/client.ts).
const EDIT_PARAM = "e7k9x2fq";

/**
 * True when `next` genuinely differs from the published `base`, using the same
 * normalized, inference-driven diff the publish dialog renders. Fields are
 * inferred from the union of both shapes so an added/removed key is still seen.
 * Used to keep draft/dirty state content-based: a value reverted to its
 * original leaves nothing behind.
 */
const contentDiffers = (
  base: Record<string, unknown>,
  next: Record<string, unknown>
): boolean =>
  entryHasChanges(
    inferFields({ ...base, ...next }) as unknown as Field[],
    base,
    next
  );

/**
 * A live-preview AI session (content-pilot dev server on a preview branch).
 * Mirrors PreviewSession in @workspace/trpc/lib/content-pilot — declared
 * locally so the client bundle never imports the server-only lib.
 */
export type PreviewSessionInfo = {
  id: string;
  repoId: number;
  status:
    | "starting"
    | "installing"
    | "ready"
    | "restarting"
    | "needs_config"
    | "failed"
    | "closed"
    | "published"
    | "expired";
  branch: string;
  previewUrl: string;
  error: string | null;
  createdAt: string;
};

/** Route-path normalizer for matching frame navigation against page entries:
 *  accepts full URLs or bare paths, strips trailing slashes, '' → '/'. */
const normalizePagePath = (value: string): string => {
  let path = value;
  try {
    path = new URL(value, "http://x").pathname;
  } catch {
    // keep as-is
  }
  path = path.replace(/\/+$/, "");
  return path === "" ? "/" : path;
};

/** An element the client clicked in the AI preview (analyzer overlay). */
export type PickedElement = {
  sourceRef: string;
  elementText: string;
  pageUrl: string;
  pagePath: string;
};

/** Controlled state for the full-screen CMS entry-management overlay. */
export type CmsOverlayState = { open: boolean; collection?: string };

/** A jump into Settings mode, optionally flashing one field's input. */
export type SettingsRequest = { section: string; field?: string };

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

/**
 * A dynamic page discovered from the live site's sitemap (collection entry,
 * legal page, …) — not in the manifest, but viewable in the iframe like any
 * page. `parentPath` is the deepest manifest page it nests under, or null for
 * the tree's "More pages" group.
 */
export type SitemapPageInfo = {
  path: string;
  url: string;
  title: string;
  kind: "page";
  parentPath: string | null;
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
  /** Sitemap-discovered dynamic pages (not in the manifest). */
  entryPages: SitemapPageInfo[];
  /** Every pathname in the live sitemap (raw, incl. manifest pages). */
  sitemapPaths: string[];
  /** Sitemap fetch settled successfully — gate SEO warnings on this. */
  sitemapLoaded: boolean;
  siteOrigin: string | null;
  /** The active AI session, when one exists for this project. */
  session: PreviewSessionInfo | null;
  /** Origin of the session's dev-server preview while it is ready, else null. */
  previewOrigin: string | null;
  /** Short-lived repo-scoped token — the chat panel auths SSE/API with it. */
  editToken: string;
  pagesLoading: boolean;
  pagesError: Error | null;
  /** No website URL set for the project — the canvas prompts to add a domain. */
  needsDomain: boolean;
  isV2: boolean;
  /** v2 repo whose root _pages.json is missing/unreadable — edits blocked. */
  pagesMissing: boolean;
  manifest: ManifestData | null;
  entryMap: CanvasEntryMap;
  copiesVersion: number;
  /** Page paths with unpublished edits (route-matched entries only). */
  dirtyPagePaths: Set<string>;

  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  /** The page currently shown in the canvas (route + absolute URL). */
  currentPage: { path: string; url: string | null } | null;
  /** Element the client clicked in the AI preview, attached to the next message. */
  pickedElement: PickedElement | null;
  clearPickedElement: () => void;
  /** Path the preview iframe is actually on (follows in-frame navigation). */
  previewFramePath: string | null;

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
  /** Structural array op (add/remove/move) — used by the group dialog. */
  applyGroupStructuralOp: (
    framePath: string,
    path: string,
    op: "add" | "remove" | "move",
    index: number,
    toIndex?: number
  ) => void;

  // CMS overlay (opened from the header + page-tree collection rows).
  cmsOverlay: CmsOverlayState;
  setCmsOverlay: (state: CmsOverlayState) => void;

  // A request to jump into Settings (e.g. a variant click) — the shell flips to
  // Settings mode and highlights `field` in that section's form.
  settingsRequest: SettingsRequest | null;
  setSettingsRequest: (state: SettingsRequest | null) => void;

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
  const { myRole } = useRepo();
  // view-only collaborators get a read-only canvas: no edit token (no
  // request-a-change overlay), no armed inline editing.
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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

  // Short-lived, repo-scoped token for the edit iframe (server-minted by
  // cms.aiEdits.mintEditToken). Keeps the long-lived content-pilot key off the
  // browser; refetch inside the token's TTL so a long session stays valid.
  const editTokenQuery = useQuery(
    trpc.cms.aiEdits.mintEditToken.queryOptions(
      { owner, repo },
      {
        enabled: Boolean(owner && repo) && canEdit,
        staleTime: 25 * 60 * 1000,
        refetchInterval: 25 * 60 * 1000,
      }
    )
  );
  const editToken = editTokenQuery.data?.token ?? "";

  const pages: CanvasPageInfo[] = useMemo(
    () => pagesQuery.data?.pages ?? [],
    [pagesQuery.data]
  );
  const siteOrigin = pagesQuery.data?.origin || null;
  const needsDomain = pagesQuery.data?.needsDomain ?? false;

  // Live-preview AI session: while one is ready, the canvas swaps to the
  // dev-server preview and the chat panel drives edits. Fast poll during
  // startup (install + boot take a while), slow heartbeat once ready.
  const sessionQuery = useQuery(
    trpc.cms.previewSession.get.queryOptions(
      { owner, repo },
      {
        enabled: Boolean(owner && repo) && canEdit,
        refetchInterval: (query) => {
          const status = query.state.data?.session?.status;
          return status === "starting" ||
            status === "installing" ||
            status === "restarting"
            ? 2_000
            : 15_000;
        },
      }
    )
  );
  const session = (sessionQuery.data?.session ?? null) as PreviewSessionInfo | null;
  const previewOrigin = useMemo(() => {
    if (session?.status !== "ready") return null;
    try {
      return new URL(session.previewUrl).origin;
    } catch {
      return null;
    }
  }, [session?.status, session?.previewUrl]);
  // Everything postMessage-shaped targets the origin the iframe actually
  // shows: the preview during a session, the live site otherwise.
  const activeOrigin = previewOrigin ?? siteOrigin;

  // Dynamic pages from the deployed sitemap: everything the live site serves
  // that the manifest doesn't know about (collection entries, legal pages, …).
  // Each nests under the deepest manifest page prefixing its path.
  const sitemapQuery = useQuery(
    trpc.cms.pages.sitemap.queryOptions(
      { owner, repo },
      {
        enabled: Boolean(owner && repo && siteOrigin),
        staleTime: 5 * 60 * 1000,
      }
    )
  );
  // Pages discovered by browsing the preview during an AI session (e.g. a
  // brand-new collection entry the AI just created) — served by the dev
  // server but absent from the live sitemap. Added on visit via
  // preview-navigate; session-local by nature.
  const [sessionPages, setSessionPages] = useState<SitemapPageInfo[]>([]);

  const entryPages: SitemapPageInfo[] = useMemo(() => {
    if (!siteOrigin) return sessionPages;
    const known = new Set(pages.map((page) => page.path));
    const parents = pages
      .filter((page) => page.kind !== "collection" && page.path !== "/")
      .map((page) => page.path)
      .sort((a, b) => b.length - a.length);
    const result: SitemapPageInfo[] = [];
    for (const path of sitemapQuery.data?.paths ?? []) {
      if (known.has(path)) continue;
      const parentPath =
        parents.find((parent) => path.startsWith(parent + "/")) ?? null;
      result.push({
        path,
        url: new URL(path, siteOrigin).href,
        title: path.split("/").filter(Boolean).pop() ?? path,
        kind: "page",
        parentPath,
      });
    }
    const listed = new Set([...known, ...result.map((entry) => entry.path)]);
    for (const entry of sessionPages) {
      if (!listed.has(entry.path)) result.push(entry);
    }
    return result;
  }, [pages, siteOrigin, sitemapQuery.data, sessionPages]);

  // Which page's iframe is currently shown. Defaults to the first page.
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  useEffect(() => {
    if (
      selectedPath &&
      (pages.some((page) => page.path === selectedPath) ||
        entryPages.some((page) => page.path === selectedPath))
    )
      return;
    const firstPage = pages.find((page) => page.kind !== "collection");
    setSelectedPath(firstPage?.path ?? pages[0]?.path ?? null);
  }, [pages, entryPages, selectedPath]);

  // The page currently shown in the canvas — attached to every AI chat message
  // so the AI knows where to look without scanning the repo.
  const currentPage = useMemo(() => {
    if (!selectedPath) return null;
    const page =
      pages.find((entry) => entry.path === selectedPath) ??
      entryPages.find((entry) => entry.path === selectedPath) ??
      null;
    return { path: selectedPath, url: page?.url ?? null };
  }, [selectedPath, pages, entryPages]);

  // Element the client clicked in the AI preview (analyzer overlay → element-pick).
  const [pickedElement, setPickedElement] = useState<PickedElement | null>(null);
  const clearPickedElement = useCallback(() => setPickedElement(null), []);

  // The path the preview iframe is actually on (analyzer → preview-navigate).
  // Lets the page tree follow in-frame navigation, and lets PageFrame skip
  // re-navigating a frame that's already on the selected page.
  const [previewFramePath, setPreviewFramePath] = useState<string | null>(null);

  // Discovered pages belong to one session's branch — drop them when the
  // session changes or ends (the live site doesn't have those pages).
  const sessionId = session?.id ?? null;
  useEffect(() => {
    setSessionPages([]);
    setPreviewFramePath(null);
  }, [sessionId]);

  // ------------------------------------------------------------------
  // The repo's root _site.json manifest is schema-less — the entry map is built
  // from the manifest + _pages.json, with field schemas inferred from the JSON
  // value shapes.
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
      { enabled: isV2, staleTime: 30_000, retry: false }
    )
  );
  // A v2 repo whose root _pages.json is missing/unreadable: edits are blocked and
  // the canvas shows a warning until the file is added at the repo root.
  const pagesMissing = isV2 && pagesContentQuery.isError;

  // variables + seo ride inline on the manifest (the root _site.json).
  // Memoized so it's a stable dependency for the hooks that diff against it.
  const variablesContent: Record<string, unknown> = useMemo(
    () =>
      (manifest?.object.variables as Record<string, unknown> | undefined) ?? {},
    [manifest]
  );
  const variablesSha = manifest?.sha ?? null;
  const variablesReady = Boolean(manifest);

  // Committed base content — the persistV2 draft assembly starts from.
  const pagesBaseRef = useRef<Record<string, unknown> | null>(null);

  const entryMap = useMemo(
    () =>
      buildV2EntryMap(
        manifest,
        (pagesContentQuery.data?.contentObject as Record<
          string,
          unknown
        > | null) ?? null,
        variablesContent
      ),
    [manifest, pagesContentQuery.data, variablesContent]
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
  const [settingsRequest, setSettingsRequest] = useState<SettingsRequest | null>(
    null
  );

  // Seed v2 working copies: one per page (a slice of _pages.json) + the site
  // entry. A stored draft (whole _pages.json) wins over committed content;
  // pages whose draft slice differs from the committed base are marked dirty.
  useEffect(() => {
    if (!isV2 || !manifest) return;
    const pagesData = pagesContentQuery.data;
    let changed = false;
    if (pagesData) {
      const base = pagesData.contentObject as Record<string, unknown>;
      pagesBaseRef.current = base;
      const pagesPath = manifest.object.paths.pages;
      const draft = getDraft(owner, repo, branch, pagesPath);
      // Prune a pre-existing draft that no longer differs from published (e.g.
      // an edit that was reverted before this content-based check existed). Uses
      // the same whole-file normalized diff as the publish dialog.
      if (
        draft &&
        !contentDiffers(base, draft.values as Record<string, unknown>)
      ) {
        useDraftsStore.getState().deleteDraft(draftKey(owner, repo, branch, pagesPath));
      }
      const livePagesDraft = getDraft(owner, repo, branch, pagesPath);
      // Flat contract (version 2): no per-page nesting — every page's working
      // copy IS the whole flat object.
      const flat = manifest.object.version === 2;
      for (const entry of entryMap.routes) {
        if (entry.name === SITE_ENTRY || copiesRef.current.has(entry.name))
          continue;
        const draftValues = livePagesDraft?.values as
          | Record<string, unknown>
          | undefined;
        const draftSlice = flat
          ? draftValues
          : (draftValues?.[entry.name] as Record<string, unknown> | undefined);
        const baseSlice = (
          flat ? base : (base[entry.name] ?? {})
        ) as Record<string, unknown>;
        copiesRef.current.set(entry.name, {
          entry,
          sha: livePagesDraft?.sha ?? pagesData.sha ?? null,
          values: draftSlice ?? baseSlice,
        });
        if (draftSlice && contentDiffers(baseSlice, draftSlice)) {
          dirtyRef.current.add(entry.name);
        }
        changed = true;
      }
    }
    if (variablesReady && !copiesRef.current.has(SITE_ENTRY)) {
      const siteEntry = entryMap.byName.get(SITE_ENTRY);
      if (siteEntry) {
        const variablesPath = manifest.object.paths.variables;
        const draft = getDraft(owner, repo, branch, variablesPath);
        // The shared _site.json draft holds `{ variables, seo }` — the variables
        // slice is our working copy.
        const draftValues = draft?.values as
          | Record<string, unknown>
          | undefined;
        const draftVariables = draftValues?.variables as
          | Record<string, unknown>
          | undefined;
        const variablesChanged = Boolean(
          draftVariables && contentDiffers(variablesContent, draftVariables)
        );
        // Prune a stale site draft whose only content is a reverted (no-op)
        // variables slice and nothing else pending (no seo).
        if (
          draft &&
          !variablesChanged &&
          !("seo" in (draftValues ?? {}))
        ) {
          useDraftsStore
            .getState()
            .deleteDraft(draftKey(owner, repo, branch, variablesPath));
        }
        copiesRef.current.set(SITE_ENTRY, {
          entry: siteEntry,
          sha: draft?.sha ?? variablesSha,
          values: draftVariables ?? variablesContent ?? {},
        });
        if (variablesChanged) dirtyRef.current.add(SITE_ENTRY);
        changed = true;
      }
    }
    if (changed) setCopiesVersion((version) => version + 1);
  }, [
    isV2,
    manifest,
    pagesContentQuery.data,
    variablesReady,
    variablesContent,
    variablesSha,
    entryMap,
    owner,
    repo,
    branch,
  ]);

  /** Push current draft values into one frame (used on ready + remount). */
  const pushDraftsToFrame = useCallback(
    (framePath: string) => {
      if (!activeOrigin) return;
      const iframe = framesRef.current.get(framePath);
      if (!iframe?.contentWindow) return;
      const values: Array<{ path: string; value: string }> = [];
      for (const entry of candidatesFor(entryMap, framePath)) {
        if (!dirtyRef.current.has(entry.name)) continue;
        const copy = copiesRef.current.get(entry.name);
        if (copy) values.push(...flattenTextValues(copy.values));
      }
      postSet(iframe.contentWindow, activeOrigin, values);
    },
    [entryMap, activeOrigin]
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
      const flat = manifest.object.version === 2;
      let changed = false;
      for (const entry of candidatesFor(entryMap, framePath)) {
        if (entry.name === SITE_ENTRY) continue;
        const draftSlice = flat
          ? draftValues
          : (draftValues?.[entry.name] as Record<string, unknown> | undefined);
        const baseSlice = (
          flat ? base : (base[entry.name] ?? {})
        ) as Record<string, unknown>;
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
      if (!activeOrigin) return;
      if (entryMap.routes.length === 0) return; // schema not loaded yet
      const fields = frameFieldsRef.current.get(framePath);
      if (!fields) return; // frame hasn't announced `ready`
      const iframe = framesRef.current.get(framePath);
      if (!iframe?.contentWindow) return;
      // view-only: arm nothing so no field is inline-editable.
      postEditable(
        iframe.contentWindow,
        activeOrigin,
        canEdit
          ? classifyEditable(candidatesFor(entryMap, framePath), fields)
          : { arm: [], media: [], link: [] }
      );
    },
    [entryMap, activeOrigin, canEdit]
  );

  /** Broadcast one changed value to every mounted frame that shows it. */
  const propagate = useCallback(
    (entryName: string, fieldPath: string, value: string, exclude?: string) => {
      if (!activeOrigin) return;
      for (const [framePath, iframe] of framesRef.current) {
        if (framePath === exclude || !iframe.contentWindow) continue;
        const shows = candidatesFor(entryMap, framePath).some(
          (entry) => entry.name === entryName
        );
        if (shows) {
          postSet(iframe.contentWindow, activeOrigin, [
            { path: fieldPath, value },
          ]);
        }
      }
    },
    [entryMap, activeOrigin]
  );

  /**
   * Persist an entry's working copy to the drafts store. Legacy: one draft
   * per content file. v2: page entries are slices of the shared _pages.json.
   */
  // Recompute whether a single entry's working copy differs from its published
  // base, keeping dirtyRef content-based: an edit reverted to the original value
  // clears the flag (and, via persistEntryDraft, the underlying draft).
  const recomputeDirty = useCallback(
    (entry: EntryRoute) => {
      const copy = copiesRef.current.get(entry.name);
      if (!copy) return;
      const base =
        entry.name === SITE_ENTRY
          ? variablesContent
          : ((pagesBaseRef.current?.[entry.name] ?? {}) as Record<
              string,
              unknown
            >);
      if (contentDiffers(base, copy.values as Record<string, unknown>))
        dirtyRef.current.add(entry.name);
      else dirtyRef.current.delete(entry.name);
    },
    [variablesContent]
  );

  const persistEntryDraft = useCallback(
    (entry: EntryRoute) => {
      const copy = copiesRef.current.get(entry.name);
      if (!copy) return;
      const deleteDraft = useDraftsStore.getState().deleteDraft;
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
        const flat = manifest.object.version === 2;
        // Flat contract: every page copy is the WHOLE flat object, so a stale
        // copy merged after the edited entry would clobber the fresh edit —
        // re-insert the edited entry so it merges last.
        if (flat) {
          pageValues.delete(entry.name);
          pageValues.set(entry.name, copy.values);
        }
        const pagesPath = manifest.object.paths.pages;
        const key = draftKey(owner, repo, branch, pagesPath);
        const base = pagesBaseRef.current ?? {};
        const assembled = assemblePagesDraft(
          pagesBaseRef.current,
          pageValues,
          flat
        );
        // Keep every flat page copy in sync with the merged result so no copy
        // goes stale between edits on different pages.
        if (flat) {
          for (const route of entryMap.routes) {
            if (route.name === SITE_ENTRY) continue;
            const pageCopy = copiesRef.current.get(route.name);
            if (pageCopy) pageCopy.values = assembled;
          }
        }
        // No net difference from published → drop the draft entirely so the
        // Publish badge, dialog and page dots don't show a phantom change.
        if (!contentDiffers(base, assembled)) {
          deleteDraft(key);
          return;
        }
        saveDraftOrThrow(key, {
          v: 1,
          path: pagesPath,
          schemaName: "$pages",
          sha: copy.sha,
          isNew: false,
          values: assembled,
          savedAt: Date.now(),
          title: "Pages",
        });
        return;
      }
      // Variables share the root _site.json with seo (+ the untouched cms).
      // Merge our slice into the shared draft so a pending seo slice survives;
      // publish then merges the whole thing over the live cms.
      if (isV2 && manifest && entry.name === SITE_ENTRY) {
        const sitePath = manifest.object.paths.site;
        const key = draftKey(owner, repo, branch, sitePath);
        const existing =
          (getDraft(owner, repo, branch, sitePath)?.values as
            | Record<string, unknown>
            | undefined) ?? {};
        const merged: Record<string, unknown> = { ...existing };
        // Only carry the variables slice while it actually differs; dropping it
        // on revert keeps a pending seo slice alive but clears the draft when
        // nothing is left to publish.
        if (contentDiffers(variablesContent, copy.values as Record<string, unknown>))
          merged.variables = copy.values;
        else delete merged.variables;
        if (Object.keys(merged).length === 0) {
          deleteDraft(key);
          return;
        }
        saveDraftOrThrow(key, {
          v: 1,
          path: sitePath,
          schemaName: SITE_ENTRY,
          sha: copy.sha,
          isNew: false,
          values: merged,
          savedAt: Date.now(),
          title: "Site",
        });
      }
    },
    [isV2, manifest, entryMap, owner, repo, branch, variablesContent]
  );

  const commitEdit = useCallback(
    (framePath: string, fieldPath: string, rawValue: string) => {
      const candidates = candidatesFor(entryMap, framePath);
      const resolved = resolveFieldEntry(candidates, fieldPath);
      if (!resolved) return;
      const { entry, field } = resolved;
      // No root _pages.json → page content can't be edited (variables live in
      // _site.json, so those still work).
      if (pagesMissing && entry.name !== SITE_ENTRY) {
        toast.error(
          "This project has no _pages.json — add it at the repo root to edit page content."
        );
        return;
      }
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
      recomputeDirty(entry);
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
    [entryMap, persistEntryDraft, propagate, pagesMissing, recomputeDirty]
  );

  const handleGroupOp = useCallback(
    (framePath: string, msg: GroupOpMessage) => {
      if (!activeOrigin) return;
      const iframe = framesRef.current.get(framePath);
      const reply = (
        ok: boolean,
        values?: Array<{ path: string; value: string }>
      ) =>
        postToFrame(iframe?.contentWindow, activeOrigin, {
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
      recomputeDirty(resolved.entry);
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
          postToFrame(otherFrame.contentWindow, activeOrigin, {
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
    [entryMap, activeOrigin, persistEntryDraft, recomputeDirty]
  );

  const reconcileFrameGroups = useCallback(
    (framePath: string) => {
      if (!activeOrigin) return;
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
            postToFrame(iframe.contentWindow, activeOrigin, {
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
            postToFrame(iframe.contentWindow, activeOrigin, {
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
    [entryMap, activeOrigin]
  );

  /** Write a non-text field value (media URL / link href) and reflect it live. */
  const commitNonText = useCallback(
    (framePath: string, fieldPath: string, value: string) => {
      commitEdit(framePath, fieldPath, value);
      const iframe = framesRef.current.get(framePath);
      if (iframe?.contentWindow && activeOrigin) {
        postSet(iframe.contentWindow, activeOrigin, [{ path: fieldPath, value }]);
      }
    },
    [commitEdit, activeOrigin]
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
    if (!activeOrigin) return;
    const onMessage = (event: MessageEvent) => {
      const msg = parseBridgeMessage(event, activeOrigin);
      if (!msg) return;
      let framePath: string | null = null;
      for (const [key, iframe] of framesRef.current) {
        if (iframe.contentWindow === event.source) {
          framePath = key;
          break;
        }
      }
      if (!framePath) return;
      // view-only: ignore every editing action from the frame. `ready` (arms
      // nothing, see pushEditableToFrame), `link-info` and `edit-submitted` (a
      // refetch signal — the overlay already proved token possession) stay
      // allowed.
      if (
        !canEdit &&
        msg.type !== "ready" &&
        msg.type !== "link-info" &&
        msg.type !== "edit-submitted" &&
        // navigation is not an edit — view-only collaborators browse too
        msg.type !== "preview-navigate"
      )
        return;
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
        case "variant-open":
          // Jump into Settings › Variables and flash the matching input (the
          // variant name IS the variable field path). Unnamed variant just
          // opens the section.
          setSettingsRequest({
            section: "variables",
            field: msg.variant || undefined,
          });
          break;
        case "blog-open":
          // A blog region → open the Blog settings page.
          setSettingsRequest({ section: "blog" });
          break;
        case "edit-submitted":
          // The overlay created an AI-edit job — refresh the Deployments list
          // (and the header's pending dot) right away instead of waiting for
          // the 30s poll.
          queryClient.invalidateQueries({
            queryKey: trpc.cms.aiEdits.listJobs.queryOptions({ owner, repo })
              .queryKey,
          });
          break;
        case "element-pick":
          // AI preview: the client clicked an element to point the AI at it.
          // Stash it — the chat panel attaches it to the next message.
          setPickedElement({
            sourceRef: msg.sourceRef,
            elementText: msg.elementText,
            pageUrl: msg.pageUrl,
            pagePath: msg.pagePath,
          });
          break;
        case "preview-navigate": {
          // The client navigated inside the preview iframe — follow with the
          // page tree. Match by URL pathname (page.path may be a slug form).
          const framePath = normalizePagePath(msg.pagePath);
          setPreviewFramePath(framePath);
          const match = [...pages, ...entryPages].find((entry) => {
            const entryPath = normalizePagePath(entry.url || entry.path);
            return entryPath === framePath;
          });
          if (match) {
            if (match.path !== selectedPath) setSelectedPath(match.path);
            break;
          }
          // Unknown path: a page that exists only on the session branch (the
          // AI just created it). Add a session-local entry so the tree shows
          // it and select it — otherwise PageFrame would read the tree/frame
          // mismatch as tree-driven navigation and bounce the iframe back.
          const parentPath =
            pages
              .filter(
                (page) => page.kind !== "collection" && page.path !== "/"
              )
              .map((page) => page.path)
              .sort((a, b) => b.length - a.length)
              .find((parent) => framePath.startsWith(parent + "/")) ?? null;
          const discovered: SitemapPageInfo = {
            path: framePath,
            url: msg.pageUrl,
            title: framePath.split("/").filter(Boolean).pop() ?? framePath,
            kind: "page",
            parentPath,
          };
          setSessionPages((prev) =>
            prev.some((entry) => entry.path === framePath)
              ? prev
              : [...prev, discovered]
          );
          setSelectedPath(framePath);
          break;
        }
        case "link-info": {
          const href = msg.href;
          toast(`Links to ${href || "(no href)"}`, {
            action: {
              label: "Open in new tab",
              onClick: () => {
                try {
                  const url = new URL(href || "/", activeOrigin ?? undefined).href;
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
    activeOrigin,
    canEdit,
    commitEdit,
    activateField,
    pushDraftsToFrame,
    pushEditableToFrame,
    handleGroupOp,
    reconcileFrameGroups,
    queryClient,
    trpc,
    owner,
    repo,
    pages,
    entryPages,
    selectedPath,
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
      if (activeOrigin) {
        const flattened = flattenTextValues(values);
        for (const iframe of framesRef.current.values()) {
          postSet(iframe.contentWindow, activeOrigin, flattened);
        }
      }
    },
    [globalEntry, persistEntryDraft, activeOrigin]
  );

  const handleSiteConfigLiveChange = useCallback(
    (values: Record<string, unknown>) => {
      if (!activeOrigin) return;
      const flattened = flattenTextValues(values);
      for (const iframe of framesRef.current.values()) {
        postSet(iframe.contentWindow, activeOrigin, flattened);
      }
    },
    [activeOrigin]
  );

  const editSrcFor = useCallback(
    (url: string) => {
      let href = url;
      // Live-preview session: rebase the page onto the dev-server origin so
      // the canvas shows the preview branch (path + params preserved).
      if (previewOrigin) {
        try {
          const parsed = new URL(url);
          const preview = new URL(previewOrigin);
          parsed.protocol = preview.protocol;
          parsed.host = preview.host;
          href = parsed.href;
        } catch {
          // fall through with the original URL
        }
        // The chat panel is the sole write path during a session — leaving the
        // overlay dormant stops request-a-change jobs being filed against main
        // while edits are happening on the preview branch.
        return href;
      }
      // No token yet → load the page without edit mode; the frame reloads with
      // the param once the mint query resolves.
      if (!editToken) return href;
      try {
        const parsed = new URL(href);
        // The cms-bridge overlay activates on this param; its value is the
        // short-lived, repo-scoped token the overlay sends as a Bearer to the
        // content-pilot intake.
        parsed.searchParams.set(EDIT_PARAM, editToken);
        return parsed.href;
      } catch {
        return href;
      }
    },
    [editToken, previewOrigin]
  );

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

  const applyGroupStructuralOp = useCallback(
    (
      framePath: string,
      path: string,
      op: "add" | "remove" | "move",
      index: number,
      toIndex?: number
    ) => {
      handleGroupOp(framePath, {
        cms: 1,
        v: 1,
        type: "group-op",
        path,
        op,
        index,
        toIndex,
      } as GroupOpMessage);
    },
    [handleGroupOp]
  );

  const value = useMemo<CanvasEditorValue>(
    () => ({
      owner,
      repo,
      branch,
      repoBase,
      pages,
      entryPages,
      sitemapPaths: sitemapQuery.data?.paths ?? [],
      sitemapLoaded: sitemapQuery.isSuccess,
      siteOrigin,
      session,
      previewOrigin,
      editToken,
      pagesLoading: pagesQuery.isLoading,
      pagesError:
        pagesQuery.error instanceof Error ? pagesQuery.error : null,
      needsDomain,
      isV2,
      pagesMissing,
      manifest,
      entryMap,
      copiesVersion,
      dirtyPagePaths,
      selectedPath,
      setSelectedPath,
      currentPage,
      pickedElement,
      clearPickedElement,
      previewFramePath,
      registerFrame,
      editSrcFor,
      refreshFrameFromStore,
      copiesRef,
      linkEditor,
      setLinkEditor,
      groupEditor,
      setGroupEditor,
      commitNonText,
      applyGroupStructuralOp,
      cmsOverlay,
      setCmsOverlay,
      settingsRequest,
      setSettingsRequest,
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
      entryPages,
      sitemapQuery.data,
      sitemapQuery.isSuccess,
      siteOrigin,
      session,
      previewOrigin,
      editToken,
      pagesQuery.isLoading,
      pagesQuery.error,
      needsDomain,
      isV2,
      pagesMissing,
      manifest,
      entryMap,
      copiesVersion,
      dirtyPagePaths,
      selectedPath,
      currentPage,
      pickedElement,
      clearPickedElement,
      previewFramePath,
      registerFrame,
      editSrcFor,
      refreshFrameFromStore,
      linkEditor,
      groupEditor,
      commitNonText,
      applyGroupStructuralOp,
      cmsOverlay,
      settingsRequest,
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

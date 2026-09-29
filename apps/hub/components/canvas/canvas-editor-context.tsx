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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { roleAtLeast } from "@/lib/authz-shared";

import { useSessionHeartbeat } from "@/hooks/use-session-heartbeat";
import {
  parseBridgeMessage,
  postChrome,
  postPickMode,
} from "@/lib/bridge-messages";
import { repoPath } from "@/lib/paths";

// The URL param the cms-bridge overlay watches to turn edit mode on. Must match
// EDIT_PARAM in the bridge client (packages/cms-bridge/src/client.ts).
const EDIT_PARAM = "e7k9x2fq";

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
    | "paused"
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

/**
 * Headless controller for the single-page editor. All content editing moved to
 * the AI chat, so this now owns only the live-preview session, the page list +
 * sitemap that drive the page tree and iframe navigation, and the element-pick
 * plumbing that points the AI at a clicked element.
 */
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
  /** Auto-start hit the preview capacity cap — the chat panel explains it. */
  capacityMessage: string | null;
  /** Preview service unreachable or the start call hard-failed — retryable. */
  previewError: string | null;
  /** Boot ran past the timeout while still starting/installing — retryable. */
  previewTimedOut: boolean;
  /** Retry the auto-start after a capacity block (or any silent failure). */
  retryStart: () => void;
  pagesLoading: boolean;
  pagesError: Error | null;
  /** No website URL set for the project — the canvas prompts to add a domain. */
  needsDomain: boolean;

  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  /** The page currently shown in the canvas (route + absolute URL). */
  currentPage: { path: string; url: string | null } | null;
  /** Element the client clicked in the AI preview, attached to the next message. */
  pickedElement: PickedElement | null;
  clearPickedElement: () => void;
  /** Element-pick mode, armed from the canvas header cursor button. */
  pickModeActive: boolean;
  setPickMode: (active: boolean) => void;
  /** Path the preview iframe is actually on (follows in-frame navigation). */
  previewFramePath: string | null;

  registerFrame: (path: string, iframe: HTMLIFrameElement | null) => void;
  editSrcFor: (url: string) => string;
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
  // view-only collaborators get a read-only canvas: no edit token, no chat.
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const repoBase = repoPath(config?.repoId ?? 0);

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

  // Warm previews: opening the project auto-starts (or revives) the session so
  // the chat is usable the moment the client arrives — no start button. One
  // attempt per project open; capacity blocks surface in the chat panel.
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null);
  const [autoStartError, setAutoStartError] = useState<string | null>(null);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const autoStartMutation = useMutation(
    trpc.cms.previewSession.start.mutationOptions({
      onSuccess: () => {
        setCapacityMessage(null);
        setAutoStartError(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.previewSession.get.queryOptions({ owner, repo })
            .queryKey,
        });
      },
      onError: (error) => {
        if (error.data?.code === "TOO_MANY_REQUESTS") {
          setCapacityMessage(error.message);
        } else {
          // The preview service is unreachable or refused — surface it so the
          // canvas shows a retryable error instead of spinning forever.
          setAutoStartError(
            "We could not reach the preview service. Please try again in a moment."
          );
        }
      },
    })
  );
  const autoStartAttempted = useRef<string | null>(null);
  const autoStartMutate = autoStartMutation.mutate;
  useEffect(() => {
    if (!canEdit || !owner || !repo || !sessionQuery.isSuccess) return;
    if (session && session.status !== "paused") return;
    const key = `${owner}/${repo}`;
    if (autoStartAttempted.current === key) return;
    autoStartAttempted.current = key;
    autoStartMutate({ owner, repo });
  }, [
    canEdit,
    owner,
    repo,
    sessionQuery.isSuccess,
    session,
    autoStartMutate,
  ]);

  // Boot watchdog: if the session stays in a booting status past the timeout
  // (dev server never came up, supervisor wedged), stop spinning and offer a
  // retry. Each status transition (starting → installing → ...) resets the
  // timer, so real progress keeps it alive.
  const bootingStatus =
    session?.status === "starting" ||
    session?.status === "installing" ||
    session?.status === "restarting";
  useEffect(() => {
    if (!bootingStatus) {
      setBootTimedOut(false);
      return;
    }
    setBootTimedOut(false);
    const timer = setTimeout(() => setBootTimedOut(true), 180_000);
    return () => clearTimeout(timer);
  }, [bootingStatus, session?.status, session?.id]);

  const retryStart = useCallback(() => {
    setCapacityMessage(null);
    setAutoStartError(null);
    setBootTimedOut(false);
    autoStartAttempted.current = null;
    void sessionQuery.refetch();
    autoStartMutate({ owner, repo });
  }, [owner, repo, autoStartMutate, sessionQuery]);

  // The preview service is down when the status poll errors and we have no
  // session to show. Auto-start also can't fire (it waits on a successful
  // poll), so this is the signal that nothing is coming.
  const previewError =
    autoStartError ??
    (sessionQuery.isError && !session
      ? "We could not reach the preview service. Please try again in a moment."
      : null);

  // Keep the session alive while the tab is open and visible.
  useSessionHeartbeat({
    sessionId: session?.id ?? null,
    status: session?.status ?? null,
    editToken,
  });

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

  // Element-pick mode, driven by the canvas-header cursor button. The ref
  // mirrors the state so the frame message listener can re-assert it on every
  // frame (re)load without re-subscribing.
  const [pickModeActive, setPickModeActive] = useState(false);
  const pickModeRef = useRef(false);

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

  const framesRef = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const registerFrame = useCallback(
    (path: string, iframe: HTMLIFrameElement | null) => {
      if (iframe) {
        framesRef.current.set(path, iframe);
      } else {
        framesRef.current.delete(path);
      }
    },
    []
  );

  const setPickMode = useCallback(
    (active: boolean) => {
      pickModeRef.current = active;
      setPickModeActive(active);
      if (!activeOrigin) return;
      for (const iframe of framesRef.current.values()) {
        postPickMode(iframe.contentWindow, activeOrigin, active);
      }
    },
    [activeOrigin]
  );

  // Single window-level message listener; frames identified by event.source.
  // The bridge now only reports chrome-ready, in-frame navigation, and the
  // element the client picked to point the AI at — no inline editing.
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
      // view-only collaborators browse but never point the AI at an element.
      if (
        !canEdit &&
        msg.type !== "ready" &&
        msg.type !== "preview-navigate"
      )
        return;
      switch (msg.type) {
        case "ready": {
          // The hub renders its own overlay controls in the canvas header —
          // hide the in-frame launcher and re-assert pick mode (a frame
          // reload resets overlay state).
          postChrome(event.source as Window, activeOrigin, "hidden");
          postPickMode(
            event.source as Window,
            activeOrigin,
            pickModeRef.current
          );
          break;
        }
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
          // The analyzer overlay (re)initialized with this page — hide its
          // floating launcher (the hub's canvas header owns those controls)
          // and re-assert the current pick-mode state.
          postChrome(event.source as Window, activeOrigin, "hidden");
          postPickMode(
            event.source as Window,
            activeOrigin,
            pickModeRef.current
          );
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
        default:
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    activeOrigin,
    canEdit,
    pages,
    entryPages,
    selectedPath,
  ]);

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
      capacityMessage,
      previewError,
      previewTimedOut: bootTimedOut,
      retryStart,
      pagesLoading: pagesQuery.isLoading,
      pagesError:
        pagesQuery.error instanceof Error ? pagesQuery.error : null,
      needsDomain,
      selectedPath,
      setSelectedPath,
      currentPage,
      pickedElement,
      clearPickedElement,
      pickModeActive,
      setPickMode,
      previewFramePath,
      registerFrame,
      editSrcFor,
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
      capacityMessage,
      previewError,
      bootTimedOut,
      retryStart,
      pagesQuery.isLoading,
      pagesQuery.error,
      needsDomain,
      selectedPath,
      currentPage,
      pickedElement,
      clearPickedElement,
      pickModeActive,
      setPickMode,
      previewFramePath,
      registerFrame,
      editSrcFor,
    ]
  );

  return (
    <CanvasEditorContext.Provider value={value}>
      {children}
    </CanvasEditorContext.Provider>
  );
}

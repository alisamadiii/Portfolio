"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Frame, Globe } from "@/components/icon";
import { Button } from "@workspace/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { Sheet, SheetContent, SheetTitle } from "@workspace/ui/components/sheet";

import { CmsOverlay } from "@/components/cms/cms-overlay";
import {
  CanvasEditorProvider,
  useCanvasEditor,
} from "@/components/canvas/canvas-editor-context";
import { EditorOverlays } from "@/components/canvas/editor-overlays";
import { CanvasLoading } from "@/components/canvas/canvas-loading";
import { CanvasPanelHeader } from "@/components/canvas/canvas-panel-header";
import { PageFrame } from "@/components/canvas/page-frame";
import { SessionChatPanel } from "@/components/canvas/session-chat-panel";
import { type CanvasDevice } from "@/components/canvas/canvas-toolbar";
import { ShellHeader, type ShellMode } from "@/components/shell/shell-header";
import { DocsPanel } from "@/components/shell/docs-panel";
import { SettingsMode } from "@/components/settings/settings-mode";
import { DeploymentsMode } from "@/components/deployments/deployments-mode";
import { useRepo } from "@/contexts/repo-context";
import { roleAtLeast } from "@/lib/authz-shared";

/**
 * v0-style single-page editor shell: full-width header, a permanent AI chat
 * panel on the left and the canvas on the right, split by a resizable handle.
 * The canvas only ever shows the live preview session; Settings/Deployments
 * render as layers over it so the iframe never remounts. All editing state
 * lives in CanvasEditorProvider.
 */
export function EditorShell() {
  return (
    <CanvasEditorProvider>
      <ShellBody />
    </CanvasEditorProvider>
  );
}

/**
 * The chat panel's persisted width (%) from react-resizable-panels' localStorage
 * (keyed by autoSaveId), so the header tabs are positioned correctly on the
 * first paint after a refresh instead of jumping once onLayout fires.
 */
function readPersistedChatWidth(autoSaveId: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(
      `react-resizable-panels:${autoSaveId}`
    );
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, { layout?: number[] }>;
    const size = Object.values(parsed)[0]?.layout?.[0];
    return typeof size === "number" && size > 0 ? size : fallback;
  } catch {
    return fallback;
  }
}

function ShellBody() {
  const {
    pages,
    entryPages,
    selectedPath,
    pagesError,
    needsDomain,
    isV2,
    cmsOverlay,
    setCmsOverlay,
    settingsRequest,
    setSettingsRequest,
    session,
  } = useCanvasEditor();
  const { myRole } = useRepo();
  // view-only collaborators never see the CMS overlay or Deployments view.
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const [mode, setMode] = useState<ShellMode>("canvas");

  // A settings request (e.g. a variant click) flips the shell into Settings
  // mode; settings-mode then selects the section + flashes the field.
  useEffect(() => {
    if (settingsRequest) setMode("settings");
  }, [settingsRequest]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [device, setDevice] = useState<CanvasDevice>("desktop");
  const [reloadNonce, setReloadNonce] = useState(0);
  // Splitter drag: a transparent shield keeps the iframe from swallowing
  // pointer events mid-drag.
  const [dragging, setDragging] = useState(false);
  // The header's mode tabs align with the canvas left edge — the chat panel's
  // width (%) drives their offset. Initialized from the persisted layout so
  // they are placed correctly on first paint (before onLayout fires), then
  // kept live by onLayout.
  const [chatWidth, setChatWidth] = useState(() =>
    readPersistedChatWidth("hub-canvas-shell", 26)
  );

  const selectedPage =
    pages.find((page) => page.path === selectedPath) ??
    // Sitemap-discovered dynamic pages render in the iframe like any page.
    entryPages.find((page) => page.path === selectedPath) ??
    null;

  const frameUrl = useMemo(() => {
    if (!selectedPage?.url) return null;
    try {
      const parsed = new URL(selectedPage.url);
      return { host: parsed.host, path: parsed.pathname };
    } catch {
      return null;
    }
  }, [selectedPage?.url]);

  // The canvas is preview-only now: the iframe mounts once the session serves.
  const sessionReady = session?.status === "ready";
  const showFrame = Boolean(
    sessionReady &&
      selectedPage &&
      selectedPage.kind !== "collection" &&
      !pagesError
  );

  // "Preview ↗" opens the AI session's dev server on the current page in its
  // own tab — only meaningful once the session is serving.
  const previewTabUrl = useMemo(() => {
    if (session?.status !== "ready") return null;
    try {
      return new URL(frameUrl?.path ?? "/", session.previewUrl).toString();
    } catch {
      return session.previewUrl;
    }
  }, [session?.status, session?.previewUrl, frameUrl?.path]);

  return (
    <div className="bg-background flex h-full w-full flex-col overflow-hidden">
      <ShellHeader
        mode={mode}
        onModeChange={setMode}
        onToggleDocs={() => setDocsOpen((open) => !open)}
        chatWidth={chatWidth}
      />

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="hub-canvas-shell"
          onLayout={(sizes) => setChatWidth(sizes[0] ?? 26)}
        >
          {/* Left: the AI chat is the primary editing surface — always open.
              View-only collaborators get the guide instead. */}
          <ResizablePanel id="chat" order={1} defaultSize={26} minSize={18} maxSize={42}>
            <div className="bg-background h-full">
              {canEdit ? <SessionChatPanel /> : <DocsPanel />}
            </div>
          </ResizablePanel>
          <ResizableHandle onDragging={setDragging} />

          {/* Right: canvas panel */}
          <ResizablePanel id="canvas" order={2} defaultSize={74} minSize={50}>
            <div className="flex h-full flex-col">
              <CanvasPanelHeader
                device={device}
                onDeviceChange={setDevice}
                url={frameUrl}
                onReload={() => setReloadNonce((nonce) => nonce + 1)}
                previewUrl={previewTabUrl}
              />
              <div className="relative min-h-0 flex-1">
                {/* Canvas layer — ALWAYS mounted at this tree position so the
                    preview iframe survives mode switches (only `hidden`
                    toggles). Settings/Deployments overlay on top of it. */}
                <div
                  className={
                    mode === "canvas"
                      ? "flex h-full min-h-0 flex-col"
                      : "hidden"
                  }
                >
                  {!isV2 && (
                    <div className="absolute bottom-4 right-4 z-20 max-w-xs rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs shadow-sm dark:border-amber-500/40 dark:bg-amber-950/60">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-200">
                            No _site.json
                          </p>
                          <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
                            Add a <code>_site.json</code> at the repo root
                            (with <code>cms</code>, <code>seo</code>,{" "}
                            <code>variables</code>) so the CMS can load this
                            project's pages and settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {needsDomain ? (
                    <div className="bg-shell flex min-h-0 flex-1 items-center justify-center p-6">
                      <div className="bg-background w-full max-w-md rounded-2xl border p-7 text-center shadow-sm">
                        <div className="bg-primary/10 text-primary mx-auto flex size-11 items-center justify-center rounded-xl">
                          <Globe className="size-5" />
                        </div>
                        <h2 className="mt-4 text-[19px] font-semibold tracking-tight">
                          Add your website URL
                        </h2>
                        <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed">
                          The canvas previews your live site. Add the project's
                          domain so we know where it lives.
                        </p>
                        <Button
                          className="mt-5"
                          onClick={() =>
                            setSettingsRequest({ section: "domain" })
                          }
                        >
                          Add domain
                        </Button>
                      </div>
                    </div>
                  ) : pagesError ? (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
                      <Frame className="size-6" />
                      {pagesError.message}
                    </div>
                  ) : showFrame && selectedPage ? (
                    <PageFrame
                      page={selectedPage}
                      device={device}
                      reloadNonce={reloadNonce}
                    />
                  ) : (
                    <CanvasLoading status={session?.status ?? null} />
                  )}
                </div>

                {/* Mode overlays — mounted AFTER the canvas layer so its tree
                    position (and the iframe) stays stable. */}
                {mode === "settings" && (
                  <div className="bg-background absolute inset-0 z-10 flex min-h-0">
                    <SettingsMode />
                  </div>
                )}
                {mode === "deployments" && canEdit && (
                  <div className="bg-background absolute inset-0 z-10 flex min-h-0">
                    <DeploymentsMode />
                  </div>
                )}

                {dragging && <div className="absolute inset-0 z-20" />}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating editors (link / group) + CMS overlay */}
      <EditorOverlays />
      <CmsOverlay
        open={cmsOverlay.open && canEdit}
        onOpenChange={(open) =>
          setCmsOverlay(open ? { ...cmsOverlay, open } : { open })
        }
        initialCollection={cmsOverlay.collection}
      />

      {/* Client guide — opened from the header's info button. */}
      <Sheet open={docsOpen} onOpenChange={setDocsOpen}>
        <SheetContent side="right" className="w-80 gap-0 p-0 sm:max-w-80">
          <SheetTitle className="sr-only">Guide</SheetTitle>
          <DocsPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
}

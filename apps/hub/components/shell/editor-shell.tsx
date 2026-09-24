"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Frame, Globe } from "@/components/icon";
import { Button } from "@workspace/ui/components/button";

import { CmsOverlay } from "@/components/cms/cms-overlay";
import {
  CanvasEditorProvider,
  useCanvasEditor,
} from "@/components/canvas/canvas-editor-context";
import { EditorOverlays } from "@/components/canvas/editor-overlays";
import { PageFrame } from "@/components/canvas/page-frame";
import {
  CanvasToolbar,
  type CanvasDevice,
} from "@/components/canvas/canvas-toolbar";
import { ShellHeader, type ShellMode } from "@/components/shell/shell-header";
import { PageTree } from "@/components/shell/page-tree";
import { DocsPanel } from "@/components/shell/docs-panel";
import { SettingsMode } from "@/components/settings/settings-mode";
import { DeploymentsMode } from "@/components/deployments/deployments-mode";
import { useRepo } from "@/contexts/repo-context";
import { roleAtLeast } from "@/lib/authz-shared";

/**
 * Framer-style single-page editor shell: docked header, left page tree, one
 * active iframe on the gray canvas, and a collapsible docs panel. Header
 * Canvas/CMS/Settings toggle flips the center between modes. All editing
 * state lives in CanvasEditorProvider.
 */
export function EditorShell() {
  return (
    <CanvasEditorProvider>
      <ShellBody />
    </CanvasEditorProvider>
  );
}

function ShellBody() {
  const {
    pages,
    selectedPath,
    pagesError,
    needsDomain,
    isV2,
    cmsOverlay,
    setCmsOverlay,
    settingsRequest,
    setSettingsRequest,
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
  const [docsOpen, setDocsOpen] = useState(true);
  const [device, setDevice] = useState<CanvasDevice>("desktop");
  const [reloadNonce, setReloadNonce] = useState(0);

  const selectedPage =
    pages.find((page) => page.path === selectedPath) ?? null;

  const frameUrl = useMemo(() => {
    if (!selectedPage?.url) return null;
    try {
      const parsed = new URL(selectedPage.url);
      return { host: parsed.host, path: parsed.pathname };
    } catch {
      return null;
    }
  }, [selectedPage?.url]);

  const showFrame = Boolean(
    selectedPage && selectedPage.kind !== "collection" && !pagesError
  );

  return (
    <div className="bg-background flex h-full w-full flex-col overflow-hidden">
      <ShellHeader
        mode={mode}
        onModeChange={setMode}
        onOpenCms={() => setCmsOverlay({ open: true })}
        onToggleDocs={() => setDocsOpen((open) => !open)}
      />

      {mode === "settings" ? (
        <SettingsMode />
      ) : mode === "deployments" && canEdit ? (
        <DeploymentsMode />
      ) : needsDomain ? (
        <div className="bg-shell flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="bg-background w-full max-w-md rounded-2xl border p-7 text-center shadow-sm">
            <div className="bg-primary/10 text-primary mx-auto flex size-11 items-center justify-center rounded-xl">
              <Globe className="size-5" />
            </div>
            <h2 className="mt-4 text-[19px] font-semibold tracking-tight">
              Add your website URL
            </h2>
            <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed">
              The canvas previews your live site. Add the project's domain so we
              know where it lives.
            </p>
            <Button
              className="mt-5"
              onClick={() => setSettingsRequest({ section: "domain" })}
            >
              Add domain
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Left: page tree */}
          <aside className="bg-background w-60 shrink-0 border-r">
            <PageTree />
          </aside>

          {/* Center: dot-grid canvas with toolbar + a single iframe */}
          <main className="bg-shell relative flex min-w-0 flex-1 flex-col">
            {!isV2 && (
              <div className="absolute bottom-4 right-4 z-20 max-w-xs rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs shadow-sm dark:border-amber-500/40 dark:bg-amber-950/60">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      No _site.json
                    </p>
                    <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
                      Add a <code>_site.json</code> at the repo root (with{" "}
                      <code>cms</code>, <code>seo</code>, <code>variables</code>)
                      so the CMS can load this project's pages and settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {pagesError ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
                <Frame className="size-6" />
                {pagesError.message}
              </div>
            ) : showFrame && selectedPage ? (
              <>
                <CanvasToolbar
                  device={device}
                  onDeviceChange={setDevice}
                  url={frameUrl}
                  onReload={() => setReloadNonce((nonce) => nonce + 1)}
                />
                <PageFrame
                  page={selectedPage}
                  device={device}
                  reloadNonce={reloadNonce}
                />
              </>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Select a page to start editing.
              </div>
            )}
          </main>

          {/* Right: client docs */}
          {docsOpen && (
            <aside className="bg-background w-72 shrink-0 border-l">
              <DocsPanel />
            </aside>
          )}
        </div>
      )}

      {/* Floating editors (link / group) + CMS overlay */}
      <EditorOverlays />
      <CmsOverlay
        open={cmsOverlay.open && canEdit}
        onOpenChange={(open) =>
          setCmsOverlay(open ? { ...cmsOverlay, open } : { open })
        }
        initialCollection={cmsOverlay.collection}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Frame } from "@/components/icon";

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
  const { pages, selectedPath, pagesError, cmsOverlay, setCmsOverlay, settingsRequest } =
    useCanvasEditor();
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
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Left: page tree */}
          <aside className="bg-background w-60 shrink-0 border-r">
            <PageTree />
          </aside>

          {/* Center: dot-grid canvas with toolbar + a single iframe */}
          <main className="bg-shell flex min-w-0 flex-1 flex-col">
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
        open={cmsOverlay.open}
        onOpenChange={(open) =>
          setCmsOverlay(open ? { ...cmsOverlay, open } : { open })
        }
        initialCollection={cmsOverlay.collection}
      />
    </div>
  );
}

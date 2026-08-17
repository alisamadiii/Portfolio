"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  NotebookPen,
  Search,
  Settings2,
  ShieldCheck,
  Table2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { useAdminNavItems } from "@/hooks/use-admin-nav";
import { usePublish } from "@/components/publish/publish-context";
import { useCommandPalette } from "@/components/chrome/command-palette-provider";
import { RepoMenu } from "@/components/chrome/repo-menu";
import { CmsOverlay } from "@/components/cms/cms-overlay";
import { User } from "@/components/user";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { repoPath } from "@/lib/paths";

/**
 * Figma-style floating chrome over the fullscreen canvas: top-left card with
 * the repo menu / CMS overlay / admin menu / search / site settings, top-right
 * card with the user menu + publish.
 */
export type CmsOverlayState = { open: boolean; collection?: string };

export function CanvasChrome({
  onOpenSiteSettings,
  siteSettingsReady,
  cms,
  onCmsChange,
}: {
  onOpenSiteSettings?: () => void;
  siteSettingsReady?: boolean;
  /** Controlled CMS overlay state (canvas opens it from collection cards). */
  cms?: CmsOverlayState;
  onCmsChange?: (state: CmsOverlayState) => void;
}) {
  const { draftCount, openPublishDialog } = usePublish();
  const { openPalette } = useCommandPalette();
  const adminItems = useAdminNavItems();
  const { repo } = useRepo();
  const { config } = useConfig();
  // v2 (schema-less) repos have no .pages.yml `content` — and no form editor
  // to link to, so the "Classic editor" badge only renders for legacy repos.
  const hasFormEditor = Array.isArray((config?.object as any)?.content);
  const [internalCms, setInternalCms] = useState<CmsOverlayState>({
    open: false,
  });
  const cmsState = cms ?? internalCms;
  const setCmsState = onCmsChange ?? setInternalCms;

  const card =
    "bg-background/95 absolute top-3 z-30 flex items-center gap-1 rounded-xl border px-2 py-1.5 shadow-lg backdrop-blur";

  return (
    <>
      {/* Top-left card */}
      <div data-canvas-no-pan className={`${card} left-3`}>
        <RepoMenu />
        <div className="bg-border h-5 w-px" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCmsState({ open: true })}
        >
          <Table2 className="size-4" />
          <span className="max-md:hidden">CMS</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link href={repoPath(repo, "blog")}>
              <NotebookPen className="size-4" />
              <span className="max-md:hidden">Blog</span>
            </Link>
          }
        />
        {adminItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm">
                  <ShieldCheck className="size-4" />
                  <span className="max-md:hidden">Admin</span>
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="rounded-lg">
              {adminItems.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  render={
                    <Link href={item.href}>
                      {item.icon}
                      {item.label}
                    </Link>
                  }
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={openPalette}
          aria-label="Search pages"
        >
          <Search className="size-4" />
          <kbd className="bg-muted text-muted-foreground pointer-events-none rounded border px-1 font-sans text-[10px] font-medium max-md:hidden">
            ⌘K
          </kbd>
        </Button>
        {onOpenSiteSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSiteSettings}
            disabled={!siteSettingsReady}
          >
            <Settings2 className="size-4" />
            <span className="max-md:hidden">Site settings</span>
          </Button>
        )}
      </div>

      {/* Top-right card */}
      <div data-canvas-no-pan className={`${card} right-3 gap-2`}>
        <User align="end" />
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

      {/* Beta badge — links to the classic per-page form editor. Sits below the
          corner cards so it never overlaps them. Legacy repos only. */}
      {hasFormEditor && (
      <div
        data-canvas-no-pan
        className="bg-background/95 absolute top-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-2 py-1 shadow-sm backdrop-blur"
      >
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
          Beta
        </span>
        <span className="text-muted-foreground text-xs max-md:hidden">
          New canvas editing. Prefer the old way?
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-full"
          render={
            <Link href={repoPath(repo, "pages")}>
              Classic editor
              <ArrowRight className="size-3.5" />
            </Link>
          }
        />
      </div>
      )}

      <CmsOverlay
        open={cmsState.open}
        onOpenChange={(open) =>
          setCmsState(open ? { ...cmsState, open } : { open })
        }
        initialCollection={cmsState.collection}
      />
    </>
  );
}

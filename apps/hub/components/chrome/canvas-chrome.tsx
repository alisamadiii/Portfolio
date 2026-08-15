"use client";

import { useState } from "react";
import Link from "next/link";
import {
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

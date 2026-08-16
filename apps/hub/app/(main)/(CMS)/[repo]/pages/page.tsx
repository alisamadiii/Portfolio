"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";

import { cn } from "@workspace/ui/lib/utils";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { flattenNavLeaves, getContentNavigation } from "@/lib/repo-nav";

/**
 * Classic editor index — the pre-canvas way of editing content: every page /
 * collection listed, click one to open its form (`/[repo]/file/[name]`) or
 * table (`/[repo]/collection/[name]`). Linked from the canvas Beta badge.
 */
export default function Page() {
  const { config } = useConfig();
  const { repo } = useRepo();

  // Header node must be reference-stable — an inline element changes identity
  // every render and thrashes the header context (page becomes unresponsive).
  const header = useMemo(
    () => <span className="text-sm font-medium">Edit pages</span>,
    []
  );
  useRepoHeader({ header });

  const leaves = useMemo(
    () => flattenNavLeaves(getContentNavigation(config), config),
    [config]
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <DocumentTitle
        title={formatRepoBranchTitle(
          "Edit pages",
          config?.owner ?? "",
          repo,
          config?.branch ?? ""
        )}
      />
      <h1 className="text-xl font-semibold tracking-tight">Edit pages</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        The classic editor — pick a page to edit its fields.
      </p>

      {leaves.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">
          No editable pages found for this site.
        </p>
      ) : (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {leaves.map((leaf) => (
            <Link
              key={leaf.key}
              href={leaf.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl border p-3.5",
                "hover:border-primary/40 hover:bg-muted/40 transition-colors"
              )}
            >
              <span className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors">
                {leaf.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {leaf.label}
                </span>
                {leaf.breadcrumb.length > 0 && (
                  <span className="text-muted-foreground block truncate text-xs">
                    {leaf.breadcrumb.join(" › ")}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

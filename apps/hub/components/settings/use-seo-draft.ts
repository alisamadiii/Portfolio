"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { Field } from "@workspace/cms-core/types/field";

import { useConfig } from "@/contexts/config-context";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDraftsStore,
} from "@/lib/store/drafts";
import { entryHasChanges } from "@/lib/entry-diff";
import { inferFields } from "@/lib/engine/infer";

/** The seo.json shape the hub reads/writes. Both slices are schema-less bags. */
export type SeoDocument = {
  site: Record<string, unknown>;
  pages: Record<string, Record<string, unknown>>;
};

/** Synthetic form schema for the site-level SEO section. */
export const SITE_SEO_FIELDS = [
  { name: "title", label: "Title", type: "string" },
  { name: "description", label: "Description", type: "text" },
  { name: "favicon", label: "Favicon (64×64)", type: "image" },
  { name: "ogImage", label: "Social / OG image (1200×630)", type: "image" },
  { name: "appleTouchIcon", label: "Apple touch icon (180×180)", type: "image" },
  { name: "googleAnalytics", label: "Google Analytics ID", type: "string" },
] as unknown as Field[];

/** Synthetic form schema for a single page's SEO. */
export const PAGE_SEO_FIELDS = [
  { name: "title", label: "Title", type: "string" },
  { name: "description", label: "Description", type: "text" },
  { name: "ogImage", label: "Social / OG image (1200×630)", type: "image" },
] as unknown as Field[];

const emptyDoc = (): SeoDocument => ({ site: {}, pages: {} });

/**
 * Loads the seo document inline from the root _site.json manifest, keeps the
 * whole `{ site, pages }` as a working copy, and persists it to the same
 * localStorage drafts store the publish dialog reads — writing the seo slice
 * into the shared _site.json draft (alongside any variables slice).
 */
export function useSeoDraft() {
  const { config } = useConfig();
  const { manifest } = useCanvasEditor();

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const seoPath = manifest?.object.paths.seo ?? "";

  const [doc, setDoc] = useState<SeoDocument | null>(null);
  const shaRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  // Seed once from the stored draft (wins) or the committed file. The shared
  // _site.json draft holds `{ variables, seo }`, so the seo slice is what we
  // read/write; committed seo comes inline from the manifest (_site.json).
  useEffect(() => {
    if (seededRef.current || !seoPath || !manifest) return;
    const draft = getDraft(owner, repo, branch, seoPath);
    const draftSeo = (draft?.values as Record<string, unknown> | undefined)
      ?.seo as Partial<SeoDocument> | undefined;
    if (draft && draftSeo) {
      setDoc({ site: draftSeo.site ?? {}, pages: draftSeo.pages ?? {} });
      shaRef.current = draft.sha;
      seededRef.current = true;
      return;
    }
    const base =
      (manifest.object.seo as Partial<SeoDocument> | undefined) ?? null;
    setDoc({ site: base?.site ?? {}, pages: base?.pages ?? {} });
    shaRef.current = manifest.sha ?? null;
    seededRef.current = true;
  }, [seoPath, owner, repo, branch, manifest]);

  const persist = useCallback(
    (next: SeoDocument) => {
      if (!seoPath) return;
      try {
        const key = draftKey(owner, repo, branch, seoPath);
        const existing =
          (getDraft(owner, repo, branch, seoPath)?.values as
            | Record<string, unknown>
            | undefined) ?? {};
        // Reverted to the committed seo → drop the seo slice; if nothing else
        // is pending in the shared _site.json draft, remove the draft entirely
        // so the Publish count doesn't linger with no real change.
        const committedSeo =
          (manifest?.object.seo as Record<string, unknown> | undefined) ?? {};
        const nextSeo = next as unknown as Record<string, unknown>;
        const seoChanged = entryHasChanges(
          inferFields({ ...committedSeo, ...nextSeo }) as unknown as Field[],
          committedSeo,
          nextSeo
        );
        if (!seoChanged) {
          const rest = { ...existing };
          delete rest.seo;
          if (Object.keys(rest).length === 0) {
            if (getDraft(owner, repo, branch, seoPath))
              useDraftsStore.getState().deleteDraft(key);
          } else {
            saveDraftOrThrow(key, {
              v: 1,
              path: seoPath,
              schemaName: "$seo",
              sha: shaRef.current,
              isNew: shaRef.current === null,
              values: rest,
              savedAt: Date.now(),
              title: "SEO",
            });
          }
          toast.success("No changes — draft cleared");
          return;
        }
        // Merge our seo slice into the shared _site.json draft so a pending
        // variables slice survives.
        const values = { ...existing, seo: next };
        saveDraftOrThrow(key, {
          v: 1,
          path: seoPath,
          schemaName: "$seo",
          sha: shaRef.current,
          isNew: shaRef.current === null,
          values,
          savedAt: Date.now(),
          title: "SEO",
        });
        toast.success("Draft saved on this device");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft."
        );
      }
    },
    [owner, repo, branch, seoPath, manifest]
  );

  const saveSite = useCallback(
    (values: Record<string, unknown>) => {
      setDoc((prev) => {
        const next: SeoDocument = { site: values, pages: (prev ?? emptyDoc()).pages };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const savePage = useCallback(
    (pageKey: string, values: Record<string, unknown>) => {
      setDoc((prev) => {
        const base = prev ?? emptyDoc();
        const next: SeoDocument = {
          site: base.site,
          pages: { ...base.pages, [pageKey]: values },
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return {
    loading: !seededRef.current,
    site: doc?.site ?? {},
    pageSeo: (pageKey: string) => doc?.pages[pageKey] ?? {},
    saveSite,
    savePage,
  };
}

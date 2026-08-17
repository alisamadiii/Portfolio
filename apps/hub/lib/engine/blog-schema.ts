/**
 * Canonical blog schema — shared by every client.
 *
 * A blog is special: instead of inferring fields from each repo's cms.json
 * declaration (which drifts per client), the editor uses this one fixed,
 * versioned schema so every client's blog composer is identical. It is
 * future-proofed with the standard blog/SEO fields up front (most clients leave
 * the extras blank) so we never have to migrate the schema again.
 *
 * Shape matches what `collectionSchema()` returns (a legacy-shaped collection
 * schema) so the existing EntrySheet / EntryForm / draft / publish machinery
 * edits blog entries unchanged. Blog entries are always Markdown
 * (frontmatter + body); `publishV2` serializes `.md` as YAML frontmatter.
 */

import type { Field } from "@workspace/cms-core/types/field";

import { labelize } from "./infer";
import type { ManifestCollection } from "./collections";

/** Fixed field set for every client's blog. Body is a Markdown WYSIWYG. */
export const BLOG_FIELDS: Field[] = [
  { name: "title", label: "Title", type: "string", required: true },
  {
    name: "date",
    label: "Publish date",
    type: "date",
    required: true,
  },
  { name: "author", label: "Author", type: "string" },
  { name: "excerpt", label: "Excerpt", type: "text" },
  { name: "coverImage", label: "Cover image", type: "image" },
  { name: "coverImageAlt", label: "Cover image alt text", type: "string" },
  {
    name: "body",
    label: "Body",
    // TipTap WYSIWYG that serializes to Markdown (see fields/core/rich-text).
    type: "rich-text",
    options: { format: "markdown" },
  },
  // SEO overrides — fall back to title/excerpt/coverImage when blank.
  {
    name: "seo",
    label: "SEO",
    type: "object",
    collapsible: { collapsed: true },
    fields: [
      { name: "title", label: "SEO title", type: "string" },
      { name: "description", label: "SEO description", type: "text" },
      { name: "ogImage", label: "Social share image", type: "image" },
      {
        name: "canonicalUrl",
        label: "Canonical URL",
        type: "string",
        options: { type: "url" },
        description: "Set only for syndicated / cross-posted content.",
      },
    ],
  },
  // Future-proof extras — optional, good-to-have so the schema never has to change.
  {
    name: "slug",
    label: "URL slug",
    type: "string",
    description: "Optional. Overrides the URL derived from the title.",
  },
  { name: "tags", label: "Tags", type: "string", list: true },
  { name: "category", label: "Category", type: "string" },
  {
    name: "featured",
    label: "Featured",
    type: "boolean",
    description: "Pin to the top of the blog index.",
  },
  {
    name: "updatedDate",
    label: "Last updated",
    type: "date",
    description: "Powers the `dateModified` freshness signal for SEO.",
  },
];

/** A blog collection is any collection named `blog`. */
export function isBlogCollection(collection: {
  name: string;
  type?: string;
}): boolean {
  return collection.name === "blog" || collection.type === "blog";
}

/**
 * Build the collection schema for a blog collection. Uses the fixed BLOG_FIELDS
 * and forces Markdown regardless of what the repo's cms.json declares, so the
 * composer is identical for every client. Only path/name/label come from the
 * manifest declaration.
 */
export function buildBlogSchema(
  collection: ManifestCollection
): Record<string, any> {
  return {
    name: collection.name,
    label: collection.label ?? labelize(collection.name),
    type: "collection",
    path: collection.path,
    format: "yaml-frontmatter",
    extension: "md",
    filename: "{year}-{month}-{day}-{primary}.md",
    view: { primary: "title" },
    fields: BLOG_FIELDS,
  };
}

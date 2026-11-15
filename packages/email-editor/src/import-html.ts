import { generateJSON } from "@tiptap/core";
import { extensions } from "./extensions";

/**
 * Convert a raw HTML string into the editor's ProseMirror JSON document.
 * Browser-only (relies on DOMParser). Unknown tags are flattened per the
 * editor schema — best-effort conversion.
 */
export function htmlToEditorJson(html: string): Record<string, any> {
  return generateJSON(html, extensions({}));
}

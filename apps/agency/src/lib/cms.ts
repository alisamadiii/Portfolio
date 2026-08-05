/** Build a `data-cms-field` value from a section prefix + sub-path.
 *  Returns undefined when no prefix is supplied (component not in preview),
 *  so the attribute is omitted for normal visitors. Root-level pages pass
 *  cmsPath="" to get bare paths (e.g. "eyebrow"). */
export function cmsField(prefix: string | undefined, sub?: string): string | undefined {
  if (prefix === undefined) return undefined;
  const path = [prefix, sub].filter(Boolean).join(".");
  return path || undefined;
}

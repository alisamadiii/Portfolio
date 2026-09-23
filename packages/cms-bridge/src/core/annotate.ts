/**
 * Framework-agnostic build-time annotation core.
 *
 * Given raw source and a list of element positions, splice a
 * `data-cms-src="<project>:<file>:<line>"` attribute into each opening tag.
 * The parse step (turning source into positioned element nodes) is
 * framework-specific and lives in each adapter; everything here — the offset
 * scanner, the splice, and the value format — is shared.
 */

/** The attribute stamped onto every annotated element. */
export const SRC_ATTR = "data-cms-src";

/** Tags that never make sense as click-to-edit targets. */
export const SKIP_TAGS = new Set([
  "html",
  "head",
  "body",
  "meta",
  "link",
  "title",
  "script",
  "style",
  "base",
  "noscript",
  "slot",
]);

export interface Insert {
  offset: number;
  text: string;
}

/** Build a `data-cms-src` value: `<project>:<relPath>:<line>` (project optional). */
export function formatSrc(
  project: string | undefined,
  relPath: string,
  line: number
): string {
  return `${project ? project + ":" : ""}${relPath}:${line}`;
}

/**
 * Find the byte offset where ` data-cms-src="…"` should be spliced into the
 * opening tag that starts at `start`: just before the terminating `>` — or,
 * for self-closing tags (`<img … />`), before the `/` and its leading
 * whitespace. Scans outside quoted attribute values and `{…}` expressions.
 * Returns -1 when no safe spot is found.
 */
export function findInsertOffset(buf: Buffer, start: number): number {
  let quote = 0; // active quote char code, 0 = none
  let braces = 0; // depth inside {expression} attribute values
  for (let i = start; i < buf.length; i++) {
    const c = buf[i];
    if (quote) {
      if (c === quote) quote = 0;
      continue;
    }
    if (c === 0x22 /* " */ || c === 0x27 /* ' */ || c === 0x60 /* ` */) {
      quote = c;
      continue;
    }
    if (c === 0x7b /* { */) braces++;
    else if (c === 0x7d /* } */ && braces > 0) braces--;
    else if (c === 0x3e /* > */ && braces === 0) {
      // Walk back over `/` + whitespace for self-closing tags.
      let j = i - 1;
      while (
        j > start &&
        (buf[j] === 0x20 ||
          buf[j] === 0x09 ||
          buf[j] === 0x0a ||
          buf[j] === 0x0d)
      )
        j--;
      if (buf[j] === 0x2f /* / */) {
        while (
          j > start &&
          (buf[j - 1] === 0x20 ||
            buf[j - 1] === 0x09 ||
            buf[j - 1] === 0x0a ||
            buf[j - 1] === 0x0d)
        )
          j--;
        return j;
      }
      return i;
    }
  }
  return -1;
}

/**
 * Apply inserts to `buf`, back-to-front so earlier offsets stay valid, and
 * return the resulting string. Returns null when there is nothing to insert.
 */
export function spliceInserts(buf: Buffer, inserts: Insert[]): string | null {
  if (!inserts.length) return null;
  inserts.sort((a, b) => b.offset - a.offset);
  const parts: Buffer[] = [];
  let end = buf.length;
  for (const ins of inserts) {
    parts.unshift(Buffer.from(ins.text), buf.subarray(ins.offset, end));
    end = ins.offset;
  }
  parts.unshift(buf.subarray(0, end));
  return Buffer.concat(parts).toString();
}

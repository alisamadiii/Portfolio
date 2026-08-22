/**
 * Minimal GitHub-style line diff for the publish review dialog. Pure —
 * no DOM, no deps. Values are pretty-printed to JSON lines, diffed with a
 * classic LCS, and long unchanged runs are collapsed to a small context
 * window around each change.
 */

export type DiffLine =
  | { type: "context" | "add" | "del"; text: string }
  | { type: "gap"; hidden: number };

/** Pretty-print a value into displayable lines (2-space JSON for objects). */
export const toJsonLines = (value: unknown): string[] => {
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "string") return value.split("\n");
  return JSON.stringify(value, null, 2).split("\n");
};

/** Above this DP size fall back to whole-block del/add (avoids UI freeze). */
const MAX_LCS_CELLS = 250_000;

export const computeLineDiff = (
  oldLines: string[],
  newLines: string[]
): DiffLine[] => {
  const m = oldLines.length;
  const n = newLines.length;

  if (m * n > MAX_LCS_CELLS) {
    return [
      ...oldLines.map((text) => ({ type: "del" as const, text })),
      ...newLines.map((text) => ({ type: "add" as const, text })),
    ];
  }

  // LCS length table (m+1 x n+1), then backtrack into diff lines.
  const table: Uint32Array = new Uint32Array((m + 1) * (n + 1));
  const at = (i: number, j: number) => table[i * (n + 1) + j]!;
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i * (n + 1) + j] =
        oldLines[i] === newLines[j]
          ? at(i + 1, j + 1) + 1
          : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      lines.push({ type: "context", text: oldLines[i]! });
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) {
      lines.push({ type: "del", text: oldLines[i]! });
      i++;
    } else {
      lines.push({ type: "add", text: newLines[j]! });
      j++;
    }
  }
  while (i < m) lines.push({ type: "del", text: oldLines[i++]! });
  while (j < n) lines.push({ type: "add", text: newLines[j++]! });
  return lines;
};

/** Keep `context` unchanged lines around each change run; collapse longer
 * unchanged runs into a gap row (GitHub's "···" separator). */
export const collapseContext = (
  lines: DiffLine[],
  context = 2
): DiffLine[] => {
  // Indexes of unchanged lines close enough to a change to stay visible.
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.type === "context") return;
    const from = Math.max(0, index - context);
    const to = Math.min(lines.length - 1, index + context);
    for (let k = from; k <= to; k++) keep[k] = true;
  });

  const out: DiffLine[] = [];
  let hidden = 0;
  const flushGap = () => {
    if (hidden > 0) out.push({ type: "gap", hidden });
    hidden = 0;
  };
  lines.forEach((line, index) => {
    if (line.type === "context" && !keep[index]) {
      hidden++;
      return;
    }
    flushGap();
    out.push(line);
  });
  flushGap();
  return out;
};

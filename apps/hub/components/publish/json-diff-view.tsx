"use client";

import { useMemo } from "react";

import {
  collapseContext,
  computeLineDiff,
  toJsonLines,
  type DiffLine,
} from "@/lib/line-diff";

/**
 * GitHub-style line diff for composite (object/array) diff values: full
 * pretty-printed JSON, `-`/`+` gutters, unchanged runs collapsed to two
 * context lines around each change. Replaces the old truncated one-liners.
 */
export function JsonDiffView({
  oldValue,
  newValue,
}: {
  oldValue: unknown;
  newValue: unknown;
}) {
  const lines = useMemo<DiffLine[]>(
    () =>
      collapseContext(
        computeLineDiff(toJsonLines(oldValue), toJsonLines(newValue))
      ),
    [oldValue, newValue]
  );

  if (lines.length === 0) {
    return (
      <p className="text-muted-foreground px-2.5 py-1.5 text-xs">
        (no changes)
      </p>
    );
  }

  return (
    <div className="overflow-x-auto font-mono text-xs leading-5">
      {lines.map((line, index) =>
        line.type === "gap" ? (
          <div
            key={index}
            className="bg-muted/40 text-muted-foreground px-2.5 py-0.5 text-center select-none"
          >
            ··· {line.hidden} unchanged {line.hidden === 1 ? "line" : "lines"}
          </div>
        ) : (
          <div
            key={index}
            className={
              line.type === "del"
                ? "flex gap-2 bg-red-500/10 px-2.5 text-red-700 dark:text-red-400"
                : line.type === "add"
                  ? "flex gap-2 bg-green-500/10 px-2.5 text-green-700 dark:text-green-400"
                  : "text-muted-foreground flex gap-2 px-2.5"
            }
          >
            <span className="shrink-0 select-none">
              {line.type === "del" ? "−" : line.type === "add" ? "+" : " "}
            </span>
            <span className="whitespace-pre">{line.text || " "}</span>
          </div>
        )
      )}
    </div>
  );
}

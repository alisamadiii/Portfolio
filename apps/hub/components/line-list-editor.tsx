"use client";

import { useRef } from "react";
import { toast } from "sonner";

import { cn } from "@workspace/ui/lib/utils";

import { Copy } from "@/components/icon";

/** Strip list decorations AI output carries: "1. ", "1) ", "- ", "• ", quotes, **bold**. */
function cleanLine(line: string): string {
  let text = line.trim();
  text = text.replace(/^(\d+[.)]\s+|[-•*]\s+)/, "");
  text = text.replace(/^\*\*(.+)\*\*$/, "$1");
  text = text.replace(/^["'](.+)["']$/, "$1");
  return text.trim();
}

/**
 * One textarea-looking box where every line is its own value: paste a whole
 * AI-generated list and each line becomes a row; click a row's copy icon to
 * copy just that line. Enter inserts a line, Backspace on an empty line
 * removes it, arrows move between lines.
 */
export function LineListEditor({
  values,
  onChange,
  placeholder,
  maxLength,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Soft limit: lines over it show a warning counter, saving still works. */
  maxLength?: number;
}) {
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const rows = values.length > 0 ? values : [""];

  const focusLine = (i: number) => {
    // After onChange the rows re-render; focus on the next frame.
    requestAnimationFrame(() => {
      const input = inputs.current.get(i);
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  };

  const setLine = (i: number, text: string) =>
    onChange(rows.map((row, j) => (j === i ? text : row)));

  const insertLines = (i: number, lines: string[]) => {
    // A pasted block replaces the current line when it's empty, otherwise it
    // lands right after it.
    const next = [...rows];
    const replaceCurrent = !next[i]?.trim();
    next.splice(replaceCurrent ? i : i + 1, replaceCurrent ? 1 : 0, ...lines);
    onChange(next);
    focusLine((replaceCurrent ? i : i + 1) + lines.length - 1);
  };

  const removeLine = (i: number) => {
    if (rows.length === 1) {
      onChange([""]);
      return;
    }
    onChange(rows.filter((_, j) => j !== i));
    focusLine(Math.max(0, i - 1));
  };

  const copyLine = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied."))
      .catch(() => toast.error("Couldn't copy."));
  };

  return (
    <div className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 w-full max-w-2xl rounded-md border py-1 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
      {rows.map((row, i) => {
        const over = maxLength !== undefined && row.length > maxLength;
        return (
          <div key={i} className="group flex items-center gap-2 px-3">
            <input
              ref={(el) => {
                if (el) inputs.current.set(i, el);
                else inputs.current.delete(i);
              }}
              value={row}
              placeholder={i === 0 && rows.length === 1 ? placeholder : undefined}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none"
              onChange={(e) => setLine(i, e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text/plain");
                if (!text.includes("\n")) return;
                e.preventDefault();
                const lines = text.split("\n").map(cleanLine).filter(Boolean);
                if (lines.length > 0) insertLines(i, lines);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = [...rows];
                  next.splice(i + 1, 0, "");
                  onChange(next);
                  focusLine(i + 1);
                } else if (e.key === "Backspace" && !row) {
                  e.preventDefault();
                  removeLine(i);
                } else if (e.key === "ArrowUp" && i > 0) {
                  e.preventDefault();
                  focusLine(i - 1);
                } else if (e.key === "ArrowDown" && i < rows.length - 1) {
                  e.preventDefault();
                  focusLine(i + 1);
                }
              }}
            />
            {over && (
              <span className="text-destructive shrink-0 text-[11px] font-medium tabular-nums">
                {row.length}/{maxLength}
              </span>
            )}
            {row.trim() && (
              <button
                type="button"
                aria-label="Copy line"
                className={cn(
                  "text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity",
                  "group-focus-within:opacity-100 group-hover:opacity-100"
                )}
                onClick={() => copyLine(row.trim())}
              >
                <Copy className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

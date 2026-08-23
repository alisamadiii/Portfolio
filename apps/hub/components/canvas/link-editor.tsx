"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, X } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

/**
 * Floating URL editor for a link. Anchored bottom-center (the link lives
 * inside an iframe, so there's no DOM element to attach a popover to). Enter
 * saves, Escape cancels.
 */
export function LinkEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <div className="bg-background fixed bottom-6 left-1/2 z-50 flex w-[min(28rem,90vw)] -translate-x-1/2 items-center gap-2 rounded-xl border p-2 shadow-xl">
      <Link2 className="text-muted-foreground ml-1 size-4 shrink-0" />
      <Input
        ref={inputRef}
        value={url}
        placeholder="https://…"
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSave(url.trim());
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="h-8 flex-1"
      />
      <Button size="sm" onClick={() => onSave(url.trim())}>
        Save
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onCancel}
        aria-label="Cancel"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

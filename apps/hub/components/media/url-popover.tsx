"use client";

import { useEffect, useState } from "react";
import { Link2, X } from "@/components/icon";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { isAbsoluteMediaUrl } from "@workspace/cms-core/utils/file";

/**
 * "Link" button + popover to add media by absolute URL. Uncontrolled by
 * default; pass `open`/`onOpenChange` (+ `initialUrl` to pre-fill the input)
 * to drive it externally — e.g. from the ImageKit widget's close event.
 */
const UrlPopover = ({
  onSubmit,
  open: openProp,
  onOpenChange,
  initialUrl,
  submitLabel = "Add image",
  placeholder = "https://cdn.example.com/image.png",
}: {
  onSubmit: (url: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialUrl?: string;
  submitLabel?: string;
  placeholder?: string;
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            <Link2 />
            Link
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80">
        {open && (
          <UrlInput
            initialUrl={initialUrl}
            submitLabel={submitLabel}
            placeholder={placeholder}
            onSubmit={(url) => {
              onSubmit(url);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};

/**
 * Bare URL input + preview + submit. Used inside `UrlPopover` and rendered
 * inline by hosted-media fields while the media library panel is open. Pass
 * `prefillUrl` to fill the input externally (e.g. from the clipboard) —
 * applied only while the input is empty so typing is never clobbered.
 */
const UrlInput = ({
  onSubmit,
  initialUrl,
  prefillUrl,
  onDismiss,
  submitLabel,
  placeholder,
}: {
  onSubmit: (url: string) => void;
  initialUrl?: string;
  prefillUrl?: string;
  onDismiss?: () => void;
  submitLabel: string;
  placeholder: string;
}) => {
  const [url, setUrl] = useState(initialUrl ?? "");

  useEffect(() => {
    if (!prefillUrl) return;
    setUrl((prev) => (prev.trim() ? prev : prefillUrl));
  }, [prefillUrl]);
  // Per-URL load tracking so switching URLs re-attempts the preview without
  // an explicit reset. Non-image URLs (e.g. PDFs) fail to load and stay hidden.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const trimmed = url.trim();
  const showPreview = isAbsoluteMediaUrl(trimmed) && failedUrl !== trimmed;

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isAbsoluteMediaUrl(trimmed)) {
      toast.error("Enter a full URL (https://…) or data URI.");
      return;
    }
    onSubmit(trimmed);
    setUrl("");
  };

  return (
    <div className="flex flex-col gap-2">
      {showPreview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt=""
          onLoad={() => setLoadedUrl(trimmed)}
          onError={() => setFailedUrl(trimmed)}
          className={cn(
            "bg-muted max-h-40 w-full rounded-md border object-contain",
            loadedUrl === trimmed ? "" : "hidden"
          )}
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder={placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="flex-1"
        />
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Dismiss URL input"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <Button type="button" size="sm" onClick={handleSubmit}>
        {submitLabel}
      </Button>
    </div>
  );
};

export { UrlPopover, UrlInput };

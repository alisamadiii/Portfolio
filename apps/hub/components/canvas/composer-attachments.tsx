"use client";

import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

import { Loader2, X } from "@/components/icon";

/** Mirrors content-pilot's USER_MESSAGES verbatim. */
export const UPLOAD_MESSAGES = {
  tooLarge: "Images must be under 1 MB",
  tooMany: "You can attach up to 10 images per message.",
  svg: "SVG files are not supported. Please upload a JPG, PNG, WebP or GIF.",
  heic: "HEIC photos are not supported here. Please export the photo as JPG or PNG first.",
  notImage:
    "Videos can't be uploaded here. Host it on YouTube, Vimeo or your own CDN and paste the link in the chat.",
  decode: "That image could not be read. Please try a JPG, PNG, WebP or GIF.",
} as const;

export const MAX_ATTACHMENTS = 10;

export type StagedAttachment = {
  /** Client-side key; the server id arrives once the upload finishes. */
  key: string;
  previewUrl: string;
  fileName: string;
  status: "preparing" | "uploading" | "ready" | "error";
  id?: string;
  width?: number;
  height?: number;
  /** Required before send: the AI never sees the image, only this. */
  description: string;
  error?: string;
};

/**
 * Staged images above the chat Textarea: thumbnail, required one-line
 * description, remove. The AI gets the description instead of the pixels, so
 * the field is the whole point, not decoration.
 */
export function AttachmentTray({
  items,
  onRemove,
  onDescribe,
  showMissing,
  notice,
  onDismissNotice,
}: {
  items: StagedAttachment[];
  onRemove: (key: string) => void;
  onDescribe: (key: string, description: string) => void;
  /** After a blocked send attempt: flag empty descriptions. */
  showMissing: boolean;
  notice: string | null;
  onDismissNotice: () => void;
}) {
  // Object URLs are owned by the chat panel (a sent message's bubble keeps
  // using them after the tray empties), so nothing is revoked here.
  if (!items.length && !notice) return null;
  return (
    <div className="flex flex-col gap-1.5 px-2 pt-2">
      {notice && (
        <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md px-2 py-1.5 text-[11.5px] leading-snug">
          <span className="min-w-0 flex-1">{notice}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismissNotice}
            className="hover:bg-destructive/15 shrink-0 rounded p-0.5"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      {items.map((item) => {
        const pending = item.status === "preparing" || item.status === "uploading";
        const missing =
          showMissing && item.status === "ready" && !item.description.trim();
        return (
          <div key={item.key} className="flex items-start gap-2">
            <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt=""
                className={cn(
                  "size-full object-cover",
                  (pending || item.status === "error") && "opacity-50"
                )}
              />
              {pending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="text-foreground size-4 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {item.status === "error" ? (
                <p className="text-destructive text-[11.5px] leading-snug">
                  {item.error ?? "Upload failed."}
                </p>
              ) : (
                <Input
                  value={item.description}
                  onChange={(event) => onDescribe(item.key, event.target.value)}
                  maxLength={200}
                  disabled={pending}
                  aria-invalid={missing || undefined}
                  aria-label={`Describe ${item.fileName}`}
                  placeholder="Describe this image, e.g. Finished kitchen remodel in Ortega"
                  className="h-7 px-2 py-0 text-[12px] md:text-[12px]"
                />
              )}
              <p
                className={cn(
                  "truncate text-[10.5px] leading-tight",
                  missing ? "text-destructive" : "text-muted-foreground/70"
                )}
              >
                {missing ? "A short description is required" : item.fileName}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Remove ${item.fileName}`}
              onClick={() => onRemove(item.key)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted mt-1 shrink-0 rounded p-0.5 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Thumbnails inside a sent user bubble. */
export function AttachmentThumbs({
  attachments,
  srcFor,
}: {
  attachments: { id: string; originalName: string }[];
  srcFor: (id: string) => string;
}) {
  if (!attachments.length) return null;
  return (
    <div className="mb-1.5 flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attachment.id}
          src={srcFor(attachment.id)}
          alt={attachment.originalName}
          loading="lazy"
          className="bg-primary-foreground/10 h-20 max-w-40 rounded-lg object-cover"
        />
      ))}
    </div>
  );
}

"use client";

import { Button } from "@workspace/ui/components/button";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";

const label = (status: string | null) =>
  status === "installing"
    ? "Preparing your site…"
    : status === "restarting"
      ? "Restarting the preview…"
      : status === "paused"
        ? "Waking your preview…"
        : status === "failed" || status === "needs_config"
          ? "Preview unavailable"
          : "Starting your preview…";

/**
 * The canvas placeholder while the preview session boots (or is blocked).
 * The iframe only ever shows the session's dev server — until it is ready
 * the canvas shows the agency mark animating on the dot grid. A hard error
 * (service down, boot timed out, capacity) shows a message and a retry;
 * failure/setup detail also shows in the chat panel.
 */
export function CanvasLoading({ status }: { status: string | null }) {
  const { capacityMessage, previewError, previewTimedOut, retryStart } =
    useCanvasEditor();
  const errorText =
    previewError ??
    (previewTimedOut
      ? "The preview is taking longer than expected to start. It may be having trouble booting."
      : null);
  const blocked =
    Boolean(errorText) || status === "failed" || status === "needs_config";

  return (
    <div
      className="bg-shell flex flex-1 flex-col items-center justify-center gap-4"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklch, var(--foreground) 14%, transparent) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="relative flex items-center justify-center">
        {!blocked && (
          <span className="bg-primary/20 absolute inline-flex size-14 animate-ping rounded-2xl" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/agency-icon.png"
          alt=""
          width={48}
          height={48}
          className={
            blocked
              ? "relative size-12 rounded-xl opacity-60 shadow-sm"
              : "relative size-12 animate-pulse rounded-xl shadow-sm"
          }
        />
      </div>
      {errorText ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            {errorText}
          </p>
          <Button size="sm" variant="outline" onClick={retryStart}>
            Try again
          </Button>
        </div>
      ) : capacityMessage ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            {capacityMessage} A slot frees up as soon as another editor
            finishes.
          </p>
          <Button size="sm" variant="outline" onClick={retryStart}>
            Try again
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-[13px]">{label(status)}</p>
      )}
    </div>
  );
}

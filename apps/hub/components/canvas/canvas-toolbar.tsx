"use client";

import { Lock, Monitor, RotateCw, Smartphone, Tablet } from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";

export type CanvasDevice = "desktop" | "tablet" | "mobile";

/** Preview frame width per device. Desktop fills the canvas. */
export const DEVICE_WIDTH: Record<CanvasDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

const DEVICES: Array<{ id: CanvasDevice; icon: typeof Monitor; label: string }> =
  [
    { id: "desktop", icon: Monitor, label: "Desktop" },
    { id: "tablet", icon: Tablet, label: "Tablet" },
    { id: "mobile", icon: Smartphone, label: "Mobile" },
  ];

/**
 * The bar above the canvas frame: device-width toggle, the live page URL, and
 * a Reload button. Purely presentational — state lives in the shell.
 */
export function CanvasToolbar({
  device,
  onDeviceChange,
  url,
  onReload,
}: {
  device: CanvasDevice;
  onDeviceChange: (device: CanvasDevice) => void;
  url: { host: string; path: string } | null;
  onReload: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2.5 px-3.5 pb-1.5 pt-2.5">
      {/* Device toggle */}
      <div className="border-border flex items-center gap-px rounded-lg border p-0.5">
        {DEVICES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={device === id}
            onClick={() => onDeviceChange(id)}
            className={cn(
              "flex h-6 w-[30px] items-center justify-center rounded-md transition-colors",
              device === id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>

      {/* URL pill */}
      {url && (
        <div className="border-border text-muted-foreground flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs">
          <Lock className="text-primary size-3" />
          <span className="max-w-[280px] truncate">
            {url.host}
            <span className="text-muted-foreground/70">{url.path}</span>
          </span>
        </div>
      )}

      {/* Reload */}
      <button
        type="button"
        onClick={onReload}
        className="border-border text-muted-foreground hover:bg-muted flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors"
      >
        <RotateCw className="size-3.5" />
        Reload
      </button>
    </div>
  );
}

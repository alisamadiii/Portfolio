import { cn } from "@workspace/ui/lib/utils";

// Green/red website status dot. When up, a second lower-opacity span behind
// the dot ping-expands forever. Shared by the /website page and the sidebar.
export const StatusDot = ({
  up,
  className,
}: {
  up: boolean;
  className?: string;
}) => (
  <span className={cn("relative flex size-2.5", className)}>
    {up && (
      <span className="bg-status-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
    )}
    <span
      className={cn(
        "relative inline-flex h-full w-full rounded-full",
        up ? "bg-status-success" : "bg-status-danger"
      )}
    />
  </span>
);

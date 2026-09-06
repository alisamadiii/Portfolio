// useSend delivery status → hub theme colors: delivered green, opened blue,
// clicked purple, in-flight amber, failures red, the rest neutral.

const EVENT_PILL: Record<string, string> = {
  delivered: "bg-status-success-bg text-status-success",
  opened: "bg-status-info-bg text-status-info",
  clicked: "bg-status-review-bg text-status-review",
  queued: "bg-status-warning-bg text-status-warning",
  scheduled: "bg-status-warning-bg text-status-warning",
  bounced: "bg-status-danger-bg text-status-danger",
  rejected: "bg-status-danger-bg text-status-danger",
  failed: "bg-status-danger-bg text-status-danger",
  complained: "bg-status-danger-bg text-status-danger",
};

export const eventPillFor = (event: string) => ({
  label: event.replace(/_/g, " "),
  className: EVENT_PILL[event] ?? "bg-status-neutral-bg text-status-neutral",
});

// Envelope tile matching the status color.
const EVENT_TILE: Record<string, string> = {
  delivered:
    "bg-status-success-bg border-status-success/50 text-status-success",
  opened: "bg-status-info-bg border-status-info/50 text-status-info",
  clicked: "bg-status-review-bg border-status-review/50 text-status-review",
  queued: "bg-status-warning-bg border-status-warning/50 text-status-warning",
  scheduled:
    "bg-status-warning-bg border-status-warning/50 text-status-warning",
  bounced: "bg-status-danger-bg border-status-danger/50 text-status-danger",
  rejected: "bg-status-danger-bg border-status-danger/50 text-status-danger",
  failed: "bg-status-danger-bg border-status-danger/50 text-status-danger",
  complained:
    "bg-status-danger-bg border-status-danger/50 text-status-danger",
};

export const eventTileFor = (event: string) =>
  EVENT_TILE[event] ??
  "bg-status-neutral-bg border-status-neutral/50 text-status-neutral";

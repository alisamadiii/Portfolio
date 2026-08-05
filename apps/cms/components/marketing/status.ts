export const STATUS_PILL: Record<string, { label: string; className: string }> =
  {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    sending: {
      label: "Sending",
      className: "bg-status-review-bg text-status-review",
    },
    paused: {
      label: "Paused",
      className: "bg-status-warning-bg text-status-warning",
    },
    completed: {
      label: "Sent",
      className: "bg-status-success-bg text-status-success",
    },
    canceled: {
      label: "Canceled",
      className: "bg-muted text-muted-foreground",
    },
    failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  };

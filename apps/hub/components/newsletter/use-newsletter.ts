"use client";

import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { appPath } from "@/lib/paths";

/** Project + permissions for the Newsletter app (the server enforces the same). */
export function useNewsletter() {
  const projectId = useProjectId();
  const role = useProject()?.role ?? null;
  return {
    projectId,
    base: appPath("newsletter"),
    /** Campaigns, templates, contacts: content editors and up. */
    canWrite: role !== "view-only",
    /** Domain and suppressions: full access only. */
    canManage: role == null || role === "full-access",
  };
}

export const CAMPAIGN_STATUS: Record<
  string,
  { label: string; tone: "success" | "neutral" | "coral" | "info" | "warning" }
> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SCHEDULED: { label: "Scheduled", tone: "info" },
  RUNNING: { label: "Sending", tone: "coral" },
  PAUSED: { label: "Paused", tone: "warning" },
  SENT: { label: "Sent", tone: "success" },
};

export const pct = (value: number | null | undefined) =>
  value == null ? "—" : `${value}%`;

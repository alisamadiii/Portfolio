import type { AdCampaign } from "@workspace/drizzle/schema";

import { BUSINESS_STEPS } from "@/components/agency/business-info-config";

type Info = Record<string, string[]>;

export type StepState = "done" | "next" | "progress" | "blocked" | "todo";

export interface StepStatus {
  state: StepState;
  /** Badge text, mono uppercase. */
  badge: string;
  tone: "success" | "accent" | "info" | "neutral";
  /** Step numbers this one unlocks (overview "Next up" line). */
  unlocks: number[];
}

const filled = (info: Info, key: string) =>
  (info[key] ?? []).some((v) => v.trim());
const count = (info: Info, key: string) =>
  (info[key] ?? []).filter((v) => v.trim()).length;

/**
 * Live status per step, computed from saved data. Dependencies: 3 and 4 need
 * step 2's segments; 7 needs a keyword from step 6. Blocked steps stay
 * clickable; the step page explains what's missing.
 */
export function stepStatuses(
  info: Info,
  campaigns: AdCampaign[]
): Map<number, StepStatus> {
  const statuses = new Map<number, StepStatus>();
  const segments = count(info, "segments");
  const keywordCount = campaigns.reduce((n, c) => n + c.keywords.length, 0);

  const put = (
    step: number,
    state: Exclude<StepState, "next">,
    badge: string,
    tone: StepStatus["tone"],
    unlocks: number[] = []
  ) => statuses.set(step, { state, badge, tone, unlocks });

  // 1 — Your business
  if (
    filled(info, "website") &&
    filled(info, "productDescription") &&
    count(info, "features") >= 1
  )
    put(1, "done", "Done", "success");
  else if (
    filled(info, "website") ||
    filled(info, "productDescription") ||
    filled(info, "features") ||
    filled(info, "goal")
  )
    put(1, "progress", "In progress", "info");
  else put(1, "todo", "10 min", "neutral", [2]);

  // 2 — Audience segments (unlocks 3 and 4)
  if (segments >= 1) put(2, "done", "Done", "success");
  else put(2, "todo", "10 min", "neutral", [3, 4]);

  // 3 — Problem, solution & key message
  const messagingAny =
    filled(info, "messagingProblem") ||
    filled(info, "messagingSolution") ||
    filled(info, "messagingKeyMessage");
  const messagingComplete =
    segments >= 1 &&
    [...Array(segments).keys()].every(
      (i) =>
        info.messagingProblem?.[i]?.trim() &&
        info.messagingSolution?.[i]?.trim() &&
        info.messagingKeyMessage?.[i]?.trim()
    );
  if (messagingComplete) put(3, "done", "Done", "success");
  else if (segments === 0) put(3, "blocked", "Needs step 2", "neutral");
  else if (messagingAny) put(3, "progress", "In progress", "info");
  else put(3, "todo", "10 min", "neutral");

  // 4 — Taglines
  if (count(info, "taglines") >= 1) put(4, "done", "Done", "success");
  else if (segments === 0) put(4, "blocked", "Needs step 2", "neutral");
  else put(4, "todo", "10 min", "neutral");

  // 5 — Brand purpose
  const answers = count(info, "purpose");
  if (answers >= 5) put(5, "done", "Done", "success");
  else if (answers > 0)
    put(5, "progress", `${answers} of 5 answered`, "info");
  else put(5, "todo", "10 min", "neutral");

  // 6 — Keywords (unlocks 7)
  if (keywordCount >= 1) put(6, "done", "Done", "success");
  else if (campaigns.length > 0)
    put(
      6,
      "progress",
      `${campaigns.length} ${campaigns.length === 1 ? "group" : "groups"} · ${keywordCount} keywords`,
      "info",
      [7]
    );
  else put(6, "todo", "10 min", "neutral", [7]);

  // 7 — Search ad text
  const adDone = campaigns.some(
    (c) =>
      c.adText.headlines.filter(Boolean).length >= 3 &&
      c.adText.descriptions.filter(Boolean).length >= 2
  );
  const adAny = campaigns.some(
    (c) =>
      c.adText.headlines.some(Boolean) ||
      c.adText.descriptions.some(Boolean) ||
      c.adText.callouts.some(Boolean)
  );
  if (adDone) put(7, "done", "Done", "success");
  else if (keywordCount === 0) put(7, "blocked", "Needs step 6", "neutral");
  else if (adAny) put(7, "progress", "In progress", "info");
  else put(7, "todo", "10 min", "neutral");

  // First incomplete, unblocked step becomes "up next".
  for (const step of BUSINESS_STEPS) {
    const status = statuses.get(step.step)!;
    if (status.state === "todo" || status.state === "progress") {
      statuses.set(step.step, {
        ...status,
        state: "next",
        badge: `Up next · ${step.minutes} min`,
        tone: "accent",
      });
      break;
    }
  }

  return statuses;
}

export function doneCount(statuses: Map<number, StepStatus>): number {
  return [...statuses.values()].filter((s) => s.state === "done").length;
}

/** The step "Continue setup" should open: up next, else first non-done. */
export function nextStep(statuses: Map<number, StepStatus>) {
  return (
    BUSINESS_STEPS.find((s) => statuses.get(s.step)?.state === "next") ??
    BUSINESS_STEPS.find((s) => statuses.get(s.step)?.state !== "done") ??
    BUSINESS_STEPS[0]!
  );
}

import { FREE_PLAN, type Entitlement, type Feature } from "./payment/plans";

// The apps a client can add to a site from /p/[projectId]/apps. Stored on
// hub_project.apps; each app page still gates itself by plan feature.
export const APP_IDS = [
  "leads",
  "analytics",
  "newsletter",
  "google-ads",
  "resend",
  "gcal",
  "neon",
  "wix",
  "feedback",
] as const;
export type AppId = (typeof APP_IDS)[number];

/** Plan feature an app's data needs; absent = any paid plan. */
export const APP_FEATURES: Partial<Record<AppId, Feature>> = {
  leads: "leads",
  analytics: "analytics",
  newsletter: "newsletter",
  "google-ads": "ads",
  feedback: "feedback",
};

/**
 * Whether a project's plan lets it add an app. Every app needs a paid
 * (monthly) plan; free projects add nothing. No admin bypass, on purpose:
 * the hub Apps page and project.setApps both use this.
 */
export const planAllowsApp = (
  appId: AppId,
  entitlement: Pick<Entitlement, "plan" | "features">
): boolean => {
  if (entitlement.plan === FREE_PLAN) return false;
  const feature = APP_FEATURES[appId];
  return !feature || entitlement.features.includes(feature);
};

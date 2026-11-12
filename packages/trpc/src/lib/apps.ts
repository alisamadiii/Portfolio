// The apps a client can add to a site from /p/[projectId]/apps. Stored on
// hub_project.apps; each app page still gates itself by plan feature.
export const APP_IDS = ["leads", "analytics", "newsletter", "google-ads"] as const;
export type AppId = (typeof APP_IDS)[number];

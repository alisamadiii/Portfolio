"use server";

import { cookies } from "next/headers";

import { HUB_VIEW_COOKIE, type HubView } from "@/lib/hub-view";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Remember which hub UI the user picked. A server component can't set cookies
 * while rendering, so the switch calls this action, then navigates so the
 * decision layout re-runs with the new cookie.
 */
export async function setHubView(view: HubView) {
  const value: HubView = view === "website" ? "website" : "agency";
  (await cookies()).set(HUB_VIEW_COOKIE, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: YEAR,
  });
}

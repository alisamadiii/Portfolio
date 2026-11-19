import { NextResponse } from "next/server";

import { verifyDoorDashWebhookToken } from "@workspace/trpc/lib/doordash-shared";

// ─── DoorDash menu pull ─────────────────────────────────────────
// DoorDash GETs <this>/{location_id} right after an onboarding request (and
// daily once live) expecting the store's menus as JSON. Phase 1 has no menu
// source yet, so every pull is answered 404 and the onboarding job lands in
// MENU_BLOCK, which the hub explains. Phase 2 replaces this with the real menu.
//
// GET /api/doordash/menu/[locationId]

export async function GET(request: Request) {
  const token = process.env.DOORDASH_WEBHOOK_TOKEN;
  if (!token) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!verifyDoorDashWebhookToken(request.headers, token)) {
    console.warn("[doordash] menu pull auth failed; headers:", [...request.headers.keys()].join(","));
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "menu_not_available", message: "Client Hub doesn't publish menus yet." },
    { status: 404 }
  );
}

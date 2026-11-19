import { NextResponse } from "next/server";

// ─── Grubhub menu pull (phase 2 seam) ───────────────────────────
// Grubhub ingests a merchant's menu by pulling JSON from a URL we give it in
// POST /pos/v1/menu/ingestion ({ menu_url, normalized_menu: true,
// merchant_ids }). Phase 1 has no menu source, so this answers 404; phase 2
// serves the normalized menu here for Grubhub and DoorDash alike.
//
// GET /api/grubhub/menu/[projectId]

export async function GET() {
  return NextResponse.json(
    { error: "menu_not_available", message: "Client Hub doesn't publish menus yet." },
    { status: 404 }
  );
}

import { NextRequest, NextResponse } from "next/server";

// Contact submissions are now logged as activity entries and emails are sent
// inline at submission time. This cron endpoint is kept as a no-op placeholder.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Contact emails are now sent inline. No weekly report needed.",
  });
}

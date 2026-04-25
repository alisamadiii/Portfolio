import { NextRequest, NextResponse } from "next/server";
import { eq, isNull, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { contactSubmissions, user } from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email";

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all unreported submissions grouped with user info
  const rows = await db
    .select({
      submission: contactSubmissions,
      userName: user.name,
      userEmail: user.email,
      userMetadata: user.metadata,
    })
    .from(contactSubmissions)
    .innerJoin(user, eq(contactSubmissions.userId, user.id))
    .where(isNull(contactSubmissions.reportedAt));

  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      clientsNotified: 0,
      totalSubmissions: 0,
    });
  }

  // Group by userId
  const grouped = new Map<
    string,
    {
      userName: string | null;
      userEmail: string | null;
      userMetadata: unknown;
      submissions: (typeof rows)[number]["submission"][];
    }
  >();

  for (const row of rows) {
    const userId = row.submission.userId!;
    if (!grouped.has(userId)) {
      grouped.set(userId, {
        userName: row.userName,
        userEmail: row.userEmail,
        userMetadata: row.userMetadata,
        submissions: [],
      });
    }
    grouped.get(userId)!.submissions.push(row.submission);
  }

  // Send emails sequentially to avoid SES burst throttling
  const submissionIds: string[] = [];

  for (const [, client] of grouped) {
    const meta = client.userMetadata as Record<string, unknown> | null;
    const toEmail = (meta?.contactEmail as string) || client.userEmail || "";
    const siteName = (meta?.siteName as string) || undefined;

    for (const submission of client.submissions) {
      const subMeta = submission.metadata as Record<string, unknown> | null;

      await sendEmail("contactMessage", toEmail, {
        name: submission.submitterName,
        email: submission.submitterEmail,
        phone: (subMeta?.phone as string) || undefined,
        message: submission.message,
        siteName,
      });

      submissionIds.push(submission.id);
    }
  }

  // Mark all as reported
  if (submissionIds.length > 0) {
    await db
      .update(contactSubmissions)
      .set({ reportedAt: new Date() })
      .where(
        sql`${contactSubmissions.id} IN (${sql.join(
          submissionIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
  }

  return NextResponse.json({
    success: true,
    clientsNotified: grouped.size,
    totalSubmissions: submissionIds.length,
  });
}

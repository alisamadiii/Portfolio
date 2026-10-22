import { NextResponse, type NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  agencyWeeklyReport,
  user,
} from "@workspace/drizzle/schema";
import AgencyWeeklyReportEmail from "@workspace/email/emails/agency-weekly-report";
import { email } from "@workspace/email";
import { buildWeeklyReport } from "@workspace/trpc/lib/agency/weekly-report";
import { getEntitlement } from "@workspace/trpc/lib/payment/entitlements";
import { urls } from "@workspace/ui/lib/company";

import { signToken } from "../../agency/newsletter/lib";

const FROM = "Client Hub <noreply@alisamadii.com>";

/**
 * Monday morning report to every agency client owner: last week's numbers vs
 * the week before. Triggered by a Coolify scheduled task:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/weekly-agency-report
 * `?repoId=…` limits the run to one client (manual testing).
 */
export async function GET(request: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const only = request.nextUrl.searchParams.get("repoId");
  const clients = await db
    .select({ client: agencyClient, ownerEmail: user.email })
    .from(agencyClient)
    .innerJoin(user, eq(user.id, agencyClient.userId));

  let sent = 0;
  let skipped = 0;
  const failed: number[] = [];

  for (const { client, ownerEmail } of clients) {
    if (!client.repoId || !client.weeklyReport || !ownerEmail) {
      skipped++;
      continue;
    }
    if (only && String(client.repoId) !== only) continue;

    try {
      // Churned or non-agency projects don't get reports.
      const entitlement = await getEntitlement(client.repoId);
      if (entitlement.product !== "agency") {
        skipped++;
        continue;
      }

      const report = await buildWeeklyReport(client);
      // A rerun of the cron never double-sends a week. The single-client
      // test hook (?repoId=…) bypasses this so a test can repeat.
      if (!only) {
        const existing = await db.query.agencyWeeklyReport.findFirst({
          where: and(
            eq(agencyWeeklyReport.repoId, client.repoId),
            eq(agencyWeeklyReport.weekFrom, report.week.from)
          ),
          columns: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }
      // A dormant account with no ads and a silent fortnight stays quiet.
      if (
        !report.spendCents &&
        report.leads.current === 0 &&
        report.leads.previous === 0
      ) {
        skipped++;
        continue;
      }

      const { error } = await email.send({
        from: FROM,
        to: ownerEmail,
        subject: `Your week: ${report.leads.current} ${report.leads.current === 1 ? "lead" : "leads"}${report.spendCents ? `, ${(report.spendCents.current / 100).toLocaleString("en-US", { style: "currency", currency: report.currency, maximumFractionDigits: 0 })} spend` : ""} (${report.label})`,
        react: AgencyWeeklyReportEmail({
          label: report.label,
          currency: report.currency,
          leads: report.leads,
          won: report.won,
          wonValueCents: report.wonValueCents,
          spendCents: report.spendCents,
          costPerLeadCents: report.costPerLeadCents,
          topCampaign: report.topCampaign,
          topSearchTerm: report.topSearchTerm,
          alerts: report.alerts,
          dashboardUrl: `${urls.cms}/marketing`,
          unsubscribeUrl: `${urls.portfolio}/api/agency/report/unsubscribe?token=${encodeURIComponent(signToken(`report:${client.id}`, 0))}`,
        }),
      });
      if (error) throw new Error(error);
      // Saved history drives the hub's Reports page.
      await db
        .insert(agencyWeeklyReport)
        .values({
          repoId: client.repoId,
          weekFrom: report.week.from,
          data: report,
          emailedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [agencyWeeklyReport.repoId, agencyWeeklyReport.weekFrom],
          set: { data: report, emailedAt: new Date() },
        });
      sent++;
    } catch (error) {
      console.error(`Weekly report failed for client ${client.id}`, error);
      failed.push(client.id);
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}

import "server-only";

import { and, eq, gte, inArray, isNotNull, ne, or, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import {
  agencyLead,
  type AgencyAdsActions,
  type AgencyLeadUploads,
} from "@workspace/drizzle/schema";

import {
  GoogleAdsError,
  isGoogleAdsConfigured,
  retrieveIngestStatus,
  uploadConversion,
} from "../google-ads";
import { ingestVerdict } from "./ingest-status";

// ─── New-lead and qualified uploads ──────────────────────────────
// Reports lead stages to the conversion actions wired on Marketing >
// Conversions. Uploads happen right away (capture, status change) and are
// retried on later reads: Google rejects clicks it hasn't processed yet and
// actions created in the last few hours.

const DAY = 24 * 60 * 60 * 1000;
// Google only accepts click conversions up to 90 days after the click.
const MAX_AGE = 90 * DAY;
const MAX_TRIES = 8;
const BATCH = 10;

type Stage = "lead" | "qualified";

type Client = {
  repoId: number;
  googleAdsCustomerId: string | null;
  googleAdsActions: AgencyAdsActions | null;
};

type Lead = typeof agencyLead.$inferSelect;

const QUALIFIED_STATUSES = ["qualified", "won"] as const;

/** Whether this lead should be reported for the stage (ignoring whether it already was). */
const wants = (lead: Lead, stage: Stage) =>
  lead.status !== "spam" &&
  Boolean(
    lead.gclid || lead.gbraid || lead.wbraid || lead.email || lead.phone
  ) &&
  (stage === "lead"
    ? lead.source === "form"
    : (QUALIFIED_STATUSES as readonly string[]).includes(lead.status));

/**
 * Upload one stage for one lead and record the outcome on the row. Never
 * throws; does nothing when the stage isn't wired, is done, or gave up.
 */
export async function reportLeadStage(
  client: Client,
  lead: Lead,
  stage: Stage
) {
  const action = client.googleAdsActions?.[stage];
  const customerId = client.googleAdsCustomerId;
  if (!action || !customerId || !isGoogleAdsConfigured()) return;
  const previous = lead.adsUploads?.[stage];
  if (
    previous?.at ||
    (previous?.tries ?? 0) >= MAX_TRIES ||
    !wants(lead, stage)
  )
    return;

  let outcome: NonNullable<AgencyLeadUploads[Stage]>;
  try {
    const { requestId } = await uploadConversion({
      customerId,
      conversionAction: action,
      currency: lead.currency,
      convertedAt: stage === "lead" ? lead.createdAt : new Date(),
      transactionId: `lead-${lead.id}-${stage}`,
      gclid: lead.gclid,
      gbraid: lead.gbraid,
      wbraid: lead.wbraid,
      email: lead.email,
      phone: lead.phone,
    });
    outcome = { at: new Date().toISOString(), ...(requestId && { requestId }) };
  } catch (error) {
    const message =
      error instanceof GoogleAdsError || error instanceof Error
        ? error.message
        : "Upload failed.";
    outcome = {
      error: message,
      // Our own setup problems (token scope) don't use up the lead's retries.
      tries: (previous?.tries ?? 0) + (message.includes("datamanager scope") ? 0 : 1),
    };
  }

  // Merge so a concurrent upload of the other stage isn't overwritten.
  await db
    .update(agencyLead)
    .set({
      adsUploads: sql`coalesce(${agencyLead.adsUploads}, '{}'::jsonb) || ${JSON.stringify({ [stage]: outcome })}::jsonb`,
    })
    .where(eq(agencyLead.id, lead.id));
}

/** Both stages for one lead, e.g. after a status change. */
export async function reportLeadStages(client: Client, lead: Lead) {
  await reportLeadStage(client, lead, "lead");
  await reportLeadStage(client, lead, "qualified");
}

// Google wants at least 30 minutes between an ingest and its status check.
const VERIFY_DELAY = 30 * 60 * 1000;
const VERIFY_STAGES = ["lead", "qualified", "won"] as const;

/**
 * Data Manager ingestion is async: a 200 on upload only means the payload was
 * received. This pass asks Google what actually happened to sent uploads and
 * records verified / verifyError on the row. Never throws.
 */
async function verifyConversionUploads(repoId: number) {
  try {
    const pendingVerify = (stage: string) =>
      sql`(${agencyLead.adsUploads} -> ${stage} ->> 'requestId') is not null and (${agencyLead.adsUploads} -> ${stage} ->> 'verified') is null and (${agencyLead.adsUploads} -> ${stage} ->> 'verifyError') is null`;

    const leads = await db
      .select()
      .from(agencyLead)
      .where(and(eq(agencyLead.repoId, repoId), or(...VERIFY_STAGES.map(pendingVerify))))
      .limit(BATCH);

    for (const lead of leads) {
      for (const stage of VERIFY_STAGES) {
        const upload = lead.adsUploads?.[stage];
        if (!upload?.requestId || upload.verified || upload.verifyError) continue;
        if (!upload.at || Date.now() - new Date(upload.at).getTime() < VERIFY_DELAY)
          continue;

        const verdict = ingestVerdict(await retrieveIngestStatus(upload.requestId));
        // Still processing: ask again on a later pass.
        if (!verdict.done) continue;
        const patch = verdict.ok
          ? { ...upload, verified: true }
          : { ...upload, verifyError: verdict.error };
        await db
          .update(agencyLead)
          .set({
            adsUploads: sql`coalesce(${agencyLead.adsUploads}, '{}'::jsonb) || ${JSON.stringify({ [stage]: patch })}::jsonb`,
          })
          .where(eq(agencyLead.id, lead.id));
      }
    }
  } catch (error) {
    // One failure (e.g. missing datamanager scope) would hit every check, so bail.
    console.error("Conversion upload verify failed", error);
  }
}

/**
 * Retry pass: leads from the last 90 days with a wired stage not yet uploaded.
 * Runs before lead and ads reads, like enrichAdClicks. Never throws.
 */
export async function syncConversionUploads(client: Client) {
  if (!client.googleAdsCustomerId || !isGoogleAdsConfigured()) return;
  // Won uploads verify too, so this runs even when no stage is wired.
  await verifyConversionUploads(client.repoId);
  const actions = client.googleAdsActions;
  if (!actions?.lead && !actions?.qualified) return;

  try {
    const pendingStage = (stage: Stage) =>
      sql`(${agencyLead.adsUploads} -> ${stage} ->> 'at') is null and coalesce((${agencyLead.adsUploads} -> ${stage} ->> 'tries')::int, 0) < ${MAX_TRIES}`;

    const leads = await db
      .select()
      .from(agencyLead)
      .where(
        and(
          eq(agencyLead.repoId, client.repoId),
          ne(agencyLead.status, "spam"),
          gte(agencyLead.createdAt, new Date(Date.now() - MAX_AGE)),
          or(
            isNotNull(agencyLead.gclid),
            isNotNull(agencyLead.gbraid),
            isNotNull(agencyLead.wbraid),
            isNotNull(agencyLead.email),
            isNotNull(agencyLead.phone)
          ),
          or(
            actions.lead
              ? and(eq(agencyLead.source, "form"), pendingStage("lead"))
              : sql`false`,
            actions.qualified
              ? and(
                  inArray(agencyLead.status, [...QUALIFIED_STATUSES]),
                  pendingStage("qualified")
                )
              : sql`false`
          )
        )
      )
      .limit(BATCH);

    await Promise.all(leads.map((lead) => reportLeadStages(client, lead)));
  } catch (error) {
    console.error("Conversion upload sync failed", error);
  }
}

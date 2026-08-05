import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { createDb } from "../db/index.js";
import {
  marketingCampaignRecipients,
  marketingCampaigns,
  marketingSettings,
} from "@workspace/drizzle/schema";
import type { Env } from "../env.js";
import { personalize, wrapMarketingHtml } from "../lib/marketing-template.js";
import { SesSendError, sendMarketingViaSes } from "../lib/ses-v2.js";
import { signUnsubToken, unsubscribeUrl } from "../lib/unsub-token.js";

export type SendCampaignParams = {
  campaignId: string;
  userId: string;
};

// SES configuration set whose event destination routes Bounce/Complaint to
// the SNS webhook (POST /v1/marketing/sns/:secret).
export const MARKETING_CONFIG_SET = "marketing";

// Sends per step. 25 × ~1024 max steps leaves headroom up to ~20k recipients.
const BATCH_SIZE = 25;
// Minimum gap between sends — ~8/sec, under the default SES 14/sec quota and
// leaving room for concurrent transactional sends.
const SEND_GAP_MS = 125;

// Durable bulk-send loop: one instance per campaign, one batch of recipients
// per step. Each recipient row is marked `sent` immediately after its SES
// call, so a retried step re-selects only `pending` rows and nobody receives
// the email twice. Pause/resume/cancel arrive via the Workflow instance API
// from the marketing routes; the DB status check per batch is belt-and-braces
// for terminate races.
export class SendCampaignWorkflow extends WorkflowEntrypoint<
  Env,
  SendCampaignParams
> {
  async run(event: WorkflowEvent<SendCampaignParams>, step: WorkflowStep) {
    const { campaignId, userId } = event.payload;

    try {
      for (let batch = 0; ; batch++) {
        const done = await step.do(
          `batch-${batch}`,
          {
            retries: { limit: 5, delay: "10 seconds", backoff: "exponential" },
            timeout: "5 minutes",
          },
          () => this.sendBatch(campaignId)
        );
        if (done) break;
      }

      await step.do("finalize", async () => {
        const db = createDb(this.env);
        // Don't overwrite a cancel that landed between the last batch and here.
        await db
          .update(marketingCampaigns)
          .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(marketingCampaigns.id, campaignId),
              eq(marketingCampaigns.status, "sending")
            )
          );
      });
    } catch (err) {
      // Retries exhausted or unexpected failure — surface it on the campaign.
      const db = createDb(this.env);
      await db
        .update(marketingCampaigns)
        .set({ status: "failed", updatedAt: new Date() })
        .where(
          and(
            eq(marketingCampaigns.id, campaignId),
            eq(marketingCampaigns.userId, userId)
          )
        );
      throw err;
    }
  }

  // Returns true when there is nothing left to send (or the campaign was
  // canceled out from under the workflow).
  private async sendBatch(campaignId: string): Promise<boolean> {
    const db = createDb(this.env);

    const [campaign] = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, campaignId))
      .limit(1);
    if (!campaign || campaign.status === "canceled") return true;

    const rows = await db
      .select()
      .from(marketingCampaignRecipients)
      .where(
        and(
          eq(marketingCampaignRecipients.campaignId, campaignId),
          eq(marketingCampaignRecipients.status, "pending")
        )
      )
      .limit(BATCH_SIZE);
    if (rows.length === 0) return true;

    const [settings] = await db
      .select()
      .from(marketingSettings)
      .where(eq(marketingSettings.userId, campaign.userId))
      .limit(1);

    // Deterministic re-wrap of the archived HTML (see marketing-template.ts).
    const wrapped = wrapMarketingHtml({
      body: campaign.html ?? "",
      editor: campaign.editor,
      fromName: settings?.fromName,
      postalAddress: settings?.postalAddress ?? "",
    });

    for (const row of rows) {
      const token = row.contactId
        ? await signUnsubToken(this.env, row.contactId)
        : "";
      const unsubUrl = row.contactId
        ? unsubscribeUrl(this.env, row.contactId, token)
        : "";
      const html = personalize(wrapped, row, unsubUrl);

      const started = Date.now();
      try {
        const messageId = await sendMarketingViaSes(this.env, {
          from: campaign.fromAddress ?? "",
          to: row.email,
          subject: campaign.subject,
          html,
          replyTo: settings?.replyTo ?? undefined,
          configurationSet: MARKETING_CONFIG_SET,
          tags: { userId: campaign.userId, campaignId },
          headers: unsubUrl
            ? {
                "List-Unsubscribe": `<${unsubUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              }
            : undefined,
        });
        await db
          .update(marketingCampaignRecipients)
          .set({ status: "sent", messageId, sentAt: new Date() })
          .where(eq(marketingCampaignRecipients.id, row.id));
      } catch (err) {
        if (err instanceof SesSendError && !err.retryable) {
          // Permanent per-recipient failure (bad address etc.) — record and
          // move on so one dead address can't stall the campaign.
          await db
            .update(marketingCampaignRecipients)
            .set({ status: "failed", error: err.message.slice(0, 500) })
            .where(eq(marketingCampaignRecipients.id, row.id));
          continue;
        }
        // Throttling / 5xx / network — rethrow so the step retries with
        // backoff. Already-sent rows were marked, so nothing double-sends.
        throw err;
      }

      const elapsed = Date.now() - started;
      if (elapsed < SEND_GAP_MS) {
        await new Promise((r) => setTimeout(r, SEND_GAP_MS - elapsed));
      }
    }

    return false;
  }
}

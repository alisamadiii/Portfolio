import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import {
  marketingCampaignRecipients,
  marketingCampaigns,
  marketingContacts,
  marketingSettings,
} from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email());

const contactInput = z.object({
  email: emailField,
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

// Campaign lifecycle (send/pause/cancel/test) is NOT here — those calls go
// through the gated Next route handlers to the Worker, because the 402 →
// purchase-dialog convention only fires on apiFetch responses.
export const marketingRouter = createTRPCRouter({
  settings: createTRPCRouter({
    get: authenticatedProcedure.query(async ({ ctx }) => {
      const [row] = await db
        .select()
        .from(marketingSettings)
        .where(eq(marketingSettings.userId, ctx.session.user.id))
        .limit(1);
      return row ?? null;
    }),

    update: authenticatedProcedure
      .input(
        z.object({
          fromName: z.string().trim().max(100).nullable().optional(),
          fromEmail: emailField.nullable().optional(),
          replyTo: emailField.nullable().optional(),
          postalAddress: z.string().trim().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [row] = await db
          .insert(marketingSettings)
          .values({ userId: ctx.session.user.id, ...input })
          .onConflictDoUpdate({
            target: marketingSettings.userId,
            set: { ...input, updatedAt: new Date() },
          })
          .returning();
        return row;
      }),
  }),

  contacts: createTRPCRouter({
    list: authenticatedProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(200).optional(),
            status: z.enum(["subscribed", "unsubscribed"]).optional(),
            page: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(100).default(25),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const pattern = input?.search ? `%${input.search}%` : null;
        const where = and(
          eq(marketingContacts.userId, ctx.session.user.id),
          input?.status ? eq(marketingContacts.status, input.status) : undefined,
          pattern
            ? or(
                ilike(marketingContacts.email, pattern),
                ilike(marketingContacts.firstName, pattern),
                ilike(marketingContacts.lastName, pattern)
              )
            : undefined
        );
        const page = input?.page ?? 0;
        const limit = input?.limit ?? 25;

        const [rows, [totalRow], [subscribedRow]] = await Promise.all([
          db
            .select()
            .from(marketingContacts)
            .where(where)
            .orderBy(desc(marketingContacts.createdAt))
            .limit(limit)
            .offset(page * limit),
          db.select({ total: count() }).from(marketingContacts).where(where),
          db
            .select({ total: count() })
            .from(marketingContacts)
            .where(
              and(
                eq(marketingContacts.userId, ctx.session.user.id),
                eq(marketingContacts.status, "subscribed")
              )
            ),
        ]);

        return {
          items: rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            unsubscribedAt: r.unsubscribedAt?.toISOString() ?? null,
          })),
          total: totalRow?.total ?? 0,
          subscribed: subscribedRow?.total ?? 0,
        };
      }),

    add: authenticatedProcedure
      .input(contactInput)
      .mutation(async ({ ctx, input }) => {
        const [row] = await db
          .insert(marketingContacts)
          .values({ userId: ctx.session.user.id, ...input })
          .onConflictDoNothing()
          .returning();
        if (!row) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${input.email} is already in your contacts.`,
          });
        }
        return { ...row, createdAt: row.createdAt.toISOString() };
      }),

    remove: authenticatedProcedure
      .input(z.object({ ids: z.array(z.uuid()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await db
          .delete(marketingContacts)
          .where(
            and(
              eq(marketingContacts.userId, ctx.session.user.id),
              inArray(marketingContacts.id, input.ids)
            )
          );
        return { removed: input.ids.length };
      }),

    // CSV import lands here in chunks (the client splits big files). Existing
    // addresses are skipped, not updated — an unsubscribed contact must never
    // be silently re-subscribed by a re-import.
    import: authenticatedProcedure
      .input(z.object({ contacts: z.array(contactInput).min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const rows = await db
          .insert(marketingContacts)
          .values(
            input.contacts.map((c) => ({ userId: ctx.session.user.id, ...c }))
          )
          .onConflictDoNothing()
          .returning({ id: marketingContacts.id });
        return {
          inserted: rows.length,
          skipped: input.contacts.length - rows.length,
        };
      }),
  }),

  campaigns: createTRPCRouter({
    list: authenticatedProcedure
      .input(
        z
          .object({
            page: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(100).default(10),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const where = eq(marketingCampaigns.userId, ctx.session.user.id);
        const page = input?.page ?? 0;
        const limit = input?.limit ?? 10;

        const [rows, [totalRow]] = await Promise.all([
          db
            .select({
              id: marketingCampaigns.id,
              name: marketingCampaigns.name,
              subject: marketingCampaigns.subject,
              status: marketingCampaigns.status,
              recipientCount: marketingCampaigns.recipientCount,
              startedAt: marketingCampaigns.startedAt,
              completedAt: marketingCampaigns.completedAt,
              createdAt: marketingCampaigns.createdAt,
            })
            .from(marketingCampaigns)
            .where(where)
            .orderBy(desc(marketingCampaigns.createdAt))
            .limit(limit)
            .offset(page * limit),
          db.select({ total: count() }).from(marketingCampaigns).where(where),
        ]);

        return {
          items: rows.map((r) => ({
            ...r,
            startedAt: r.startedAt?.toISOString() ?? null,
            completedAt: r.completedAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
          })),
          total: totalRow?.total ?? 0,
        };
      }),

    // Campaign + per-status recipient counts — the progress page polls this.
    get: authenticatedProcedure
      .input(z.object({ id: z.uuid() }))
      .query(async ({ ctx, input }) => {
        const [row] = await db
          .select()
          .from(marketingCampaigns)
          .where(
            and(
              eq(marketingCampaigns.id, input.id),
              eq(marketingCampaigns.userId, ctx.session.user.id)
            )
          )
          .limit(1);
        if (!row) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const grouped = await db
          .select({
            status: marketingCampaignRecipients.status,
            total: count(),
          })
          .from(marketingCampaignRecipients)
          .where(eq(marketingCampaignRecipients.campaignId, input.id))
          .groupBy(marketingCampaignRecipients.status);
        const counts = { pending: 0, sent: 0, failed: 0, suppressed: 0 };
        for (const g of grouped) counts[g.status] = g.total;

        const { r2Key: _r2Key, workflowInstanceId: _wf, ...campaign } = row;
        return {
          ...campaign,
          startedAt: campaign.startedAt?.toISOString() ?? null,
          completedAt: campaign.completedAt?.toISOString() ?? null,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
          counts,
        };
      }),

    create: authenticatedProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(200),
          subject: z.string().trim().min(1).max(300),
          editor: z.enum(["rich", "html"]).default("rich"),
          contentJson: z.unknown().optional(),
          html: z.string().max(500_000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [row] = await db
          .insert(marketingCampaigns)
          .values({ userId: ctx.session.user.id, ...input })
          .returning({ id: marketingCampaigns.id });
        return row;
      }),

    update: authenticatedProcedure
      .input(
        z.object({
          id: z.uuid(),
          name: z.string().trim().min(1).max(200).optional(),
          subject: z.string().trim().min(1).max(300).optional(),
          editor: z.enum(["rich", "html"]).optional(),
          contentJson: z.unknown().optional(),
          html: z.string().max(500_000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(marketingCampaigns)
          .set({ ...fields, updatedAt: new Date() })
          .where(
            and(
              eq(marketingCampaigns.id, id),
              eq(marketingCampaigns.userId, ctx.session.user.id),
              // Only drafts are editable — a sending campaign's content is
              // frozen (the workflow re-wraps it every batch).
              eq(marketingCampaigns.status, "draft")
            )
          )
          .returning({ id: marketingCampaigns.id });
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found or no longer a draft.",
          });
        }
        return row;
      }),

    delete: authenticatedProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const [row] = await db
          .delete(marketingCampaigns)
          .where(
            and(
              eq(marketingCampaigns.id, input.id),
              eq(marketingCampaigns.userId, ctx.session.user.id),
              inArray(marketingCampaigns.status, [
                "draft",
                "completed",
                "canceled",
                "failed",
              ])
            )
          )
          .returning({ id: marketingCampaigns.id });
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found or still sending.",
          });
        }
        return row;
      }),

    recipients: authenticatedProcedure
      .input(
        z.object({
          campaignId: z.uuid(),
          status: z
            .enum(["pending", "sent", "failed", "suppressed"])
            .optional(),
          page: z.number().int().min(0).default(0),
          limit: z.number().int().min(1).max(100).default(25),
        })
      )
      .query(async ({ ctx, input }) => {
        // Ownership gate before touching recipient rows.
        const [owned] = await db
          .select({ id: marketingCampaigns.id })
          .from(marketingCampaigns)
          .where(
            and(
              eq(marketingCampaigns.id, input.campaignId),
              eq(marketingCampaigns.userId, ctx.session.user.id)
            )
          )
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        const where = and(
          eq(marketingCampaignRecipients.campaignId, input.campaignId),
          input.status
            ? eq(marketingCampaignRecipients.status, input.status)
            : undefined
        );
        const [rows, [totalRow]] = await Promise.all([
          db
            .select({
              id: marketingCampaignRecipients.id,
              email: marketingCampaignRecipients.email,
              status: marketingCampaignRecipients.status,
              error: marketingCampaignRecipients.error,
              sentAt: marketingCampaignRecipients.sentAt,
            })
            .from(marketingCampaignRecipients)
            .where(where)
            .orderBy(
              sql`${marketingCampaignRecipients.sentAt} desc nulls last`,
              marketingCampaignRecipients.email
            )
            .limit(input.limit)
            .offset(input.page * input.limit),
          db
            .select({ total: count() })
            .from(marketingCampaignRecipients)
            .where(where),
        ]);

        return {
          items: rows.map((r) => ({
            ...r,
            sentAt: r.sentAt?.toISOString() ?? null,
          })),
          total: totalRow?.total ?? 0,
        };
      }),
  }),
});

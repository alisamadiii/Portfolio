import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import {
  CLIENT_PAYMENT_METHODS,
  hubProject,
  partner,
  partnerReferral,
  PARTNER_REFERRAL_STATUS_VALUES,
  user,
} from "@workspace/drizzle/schema";
import { renderPartnerAgreement } from "@workspace/ui/pdfs/partner-agreement";

import { adminProcedure, authenticatedProcedure, createTRPCRouter } from "../init";
import {
  agreementKey,
  agreementUrl,
  isPartnerCodeTaken,
  receiptKey,
  sendPartnerApproved,
  sendPartnerRejected,
} from "../lib/partners";
import { getEntitlements } from "../lib/payment/entitlements";
import {
  commissionFor,
  normalizePartnerCode,
  partnerCodeError,
  partnerStats,
  projectDisplayName,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
} from "../lib/partners-shared";
import { deletePrivateObject, presignPrivateGet, putPrivateObject } from "../lib/r2";

// Partner Program admin (admin.alisamadii.com/partners). Ali approves
// partners by hand, sets which Client Hub project each partner referred
// (with the website price), marks when the client paid (Stripe, Cash App,
// ...) and when the partner's 40% was sent. Partners only read (`me`).

const idInput = z.object({ id: z.uuid() });

// The code Ali types: validated and normalized (trimmed, uppercased).
const codeInput = z
  .string()
  .max(60)
  .superRefine((v, c) => {
    const problem = partnerCodeError(v);
    if (problem) c.addIssue({ code: "custom", message: problem });
  })
  .transform(normalizePartnerCode);

/** Saves the code, or CONFLICT when another partner has it (any casing). */
const setUniqueCode = async (id: string, code: string) => {
  const taken = () =>
    new TRPCError({ code: "CONFLICT", message: `${code} is already used by another partner.` });
  if (await isPartnerCodeTaken(code, id)) throw taken();
  try {
    await db.update(partner).set({ code }).where(eq(partner.id, id));
  } catch (err) {
    // Lost a race to the unique constraint.
    if ((err as { code?: string }).code === "23505") throw taken();
    throw err;
  }
};
const referralIdInput = z.object({ referralId: z.number().int().positive() });

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const centsInput = z.number().int().positive().max(10_000_000);

const getProject = async (projectId: string) => {
  const [row] = await db
    .select({ id: hubProject.id, repo: hubProject.repo, websiteUrl: hubProject.websiteUrl })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  return row;
};

const hasPayments = (r: { clientPaidAt: Date | null; partnerPaidAt: Date | null }) =>
  !!(r.clientPaidAt || r.partnerPaidAt);

/**
 * Makes `partnerId` the referrer of `projectId` at `priceCents`. One partner
 * per project: re-pointing is only allowed with `allowMove` and never once a
 * payment is recorded (undo payments first).
 */
const assignProjectReferral = async (input: {
  projectId: string;
  partnerId: string;
  priceCents: number;
  allowMove: boolean;
}) => {
  const [project] = await Promise.all([getProject(input.projectId), getPartner(input.partnerId)]);
  const businessName = projectDisplayName(project);
  const [existing] = await db
    .select({
      id: partnerReferral.id,
      partnerId: partnerReferral.partnerId,
      partnerName: partner.fullName,
      clientPaidAt: partnerReferral.clientPaidAt,
      partnerPaidAt: partnerReferral.partnerPaidAt,
    })
    .from(partnerReferral)
    .innerJoin(partner, eq(partner.id, partnerReferral.partnerId))
    .where(eq(partnerReferral.projectId, input.projectId))
    .limit(1);

  if (existing) {
    if (existing.partnerId !== input.partnerId) {
      if (!input.allowMove) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${businessName} is already referred by ${existing.partnerName}.`,
        });
      }
      if (hasPayments(existing)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This referral has payments recorded. Undo them first.",
        });
      }
    }
    await db
      .update(partnerReferral)
      .set({ partnerId: input.partnerId, priceCents: input.priceCents, businessName })
      .where(eq(partnerReferral.id, existing.id));
    return { id: existing.id };
  }
  const [row] = await db
    .insert(partnerReferral)
    .values({
      partnerId: input.partnerId,
      projectId: input.projectId,
      priceCents: input.priceCents,
      businessName,
      source: "manual",
      status: "won",
    })
    .returning({ id: partnerReferral.id });
  return { id: row!.id };
};

/** Live project name + plan label for referral rows (admin views). */
const projectInfo = async (projectIds: string[]) => {
  const ids = [...new Set(projectIds)];
  if (!ids.length) return new Map<string, { name: string; websiteUrl: string | null; plan: string; isFree: boolean }>();
  const [projects, entitlements] = await Promise.all([
    db
      .select({ id: hubProject.id, repo: hubProject.repo, websiteUrl: hubProject.websiteUrl })
      .from(hubProject)
      .where(inArray(hubProject.id, ids)),
    getEntitlements(ids),
  ]);
  const plans = new Map(entitlements.map((e) => [e.projectId, e]));
  return new Map(
    projects.map((p) => [
      p.id,
      {
        name: projectDisplayName(p),
        websiteUrl: p.websiteUrl,
        plan: plans.get(p.id)?.label ?? "Free",
        isFree: plans.get(p.id)?.plan === "website:free",
      },
    ])
  );
};

const getPartner = async (id: string) => {
  const [row] = await db.select().from(partner).where(eq(partner.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found." });
  return row;
};

// Best effort: a leftover private object is harmless, a failed DB write is not.
const dropReceipt = (key: string | null) =>
  key
    ? deletePrivateObject(key).catch((err) => console.error("[partners] receipt delete failed", err))
    : Promise.resolve();

const getReferral = async (referralId: number) => {
  const [row] = await db
    .select()
    .from(partnerReferral)
    .where(eq(partnerReferral.id, referralId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Referral not found." });
  return row;
};

const emailError = (err: unknown) =>
  new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Saved, but the email failed: ${err instanceof Error ? err.message : "unknown error"}`,
  });

export const partnersRouter = createTRPCRouter({
  // The signed-in user's own partner record for the hub's Partner page.
  // null = not a partner (the page shows the program and a link to apply).
  // Admin-only fields (notes, IP, payout method) are never returned here.
  me: authenticatedProcedure.query(async ({ ctx }) => {
    const [p] = await db
      .select({
        id: partner.id,
        status: partner.status,
        code: partner.code,
        createdAt: partner.createdAt,
        approvedAt: partner.approvedAt,
        pdfToken: partner.pdfToken,
        agreementKey: partner.agreementKey,
      })
      .from(partner)
      .where(
        or(
          eq(partner.userId, ctx.session.user.id),
          eq(partner.email, ctx.session.user.email.toLowerCase())
        )
      )
      .limit(1);
    if (!p) return null;
    // Project name only: never the client's contact details.
    const rows = await db
      .select({
        id: partnerReferral.id,
        businessName: partnerReferral.businessName,
        repo: hubProject.repo,
        websiteUrl: hubProject.websiteUrl,
        status: partnerReferral.status,
        clientPaidAt: partnerReferral.clientPaidAt,
        commissionCents: partnerReferral.commissionCents,
        partnerPaidAt: partnerReferral.partnerPaidAt,
        createdAt: partnerReferral.createdAt,
      })
      .from(partnerReferral)
      .leftJoin(hubProject, eq(hubProject.id, partnerReferral.projectId))
      .where(eq(partnerReferral.partnerId, p.id))
      .orderBy(desc(partnerReferral.createdAt));
    const referrals = rows.map(({ repo, websiteUrl, ...r }) => ({
      ...r,
      businessName: repo ? projectDisplayName({ repo, websiteUrl }) : r.businessName,
    }));
    return {
      status: p.status,
      code: p.status === "approved" ? p.code : null,
      createdAt: p.createdAt,
      approvedAt: p.approvedAt,
      agreementUrl: p.agreementKey ? agreementUrl(p.pdfToken) : null,
      referrals,
      stats: partnerStats(referrals),
    };
  }),

  list: adminProcedure.query(async () => {
    const [partners, referrals] = await Promise.all([
      db.select().from(partner).orderBy(desc(partner.createdAt)),
      db
        .select({
          partnerId: partnerReferral.partnerId,
          status: partnerReferral.status,
          clientPaidAt: partnerReferral.clientPaidAt,
          commissionCents: partnerReferral.commissionCents,
          partnerPaidAt: partnerReferral.partnerPaidAt,
        })
        .from(partnerReferral),
    ]);
    const byPartner = new Map<string, typeof referrals>();
    for (const r of referrals) {
      byPartner.set(r.partnerId, [...(byPartner.get(r.partnerId) ?? []), r]);
    }
    const totals = partnerStats(referrals);
    return {
      summary: {
        pending: partners.filter((p) => p.status === "pending").length,
        approved: partners.filter((p) => p.status === "approved").length,
        ...totals,
      },
      partners: partners.map((p) => ({
        id: p.id,
        status: p.status,
        code: p.code,
        fullName: p.fullName,
        email: p.email,
        occupation: p.occupation,
        city: p.city,
        createdAt: p.createdAt,
        stats: partnerStats(byPartner.get(p.id) ?? []),
      })),
    };
  }),

  get: adminProcedure.input(idInput).query(async ({ input }) => {
    const p = await getPartner(input.id);
    const referrals = await db
      .select()
      .from(partnerReferral)
      .where(eq(partnerReferral.partnerId, p.id))
      .orderBy(asc(partnerReferral.createdAt));
    // Hub accounts created or signed in with this partner's ?ref link
    // (user.metadata.referral, set in packages/auth). A hint for adding
    // referrals by hand; never shown to the partner.
    const signups = await db
      .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
      .from(user)
      .where(sql`${user.metadata} -> 'referral' ->> 'partnerId' = ${p.id}`)
      .orderBy(desc(user.createdAt))
      .limit(200);
    const info = await projectInfo(referrals.flatMap((r) => (r.projectId ? [r.projectId] : [])));
    const { pdfToken, agreementKey: key, ...rest } = p;
    return {
      partner: { ...rest, hasAgreement: !!key },
      referrals: referrals.map((r) => ({
        ...r,
        project: r.projectId ? (info.get(r.projectId) ?? null) : null,
      })),
      stats: partnerStats(referrals),
      signups,
      agreementPublicUrl: key ? agreementUrl(pdfToken) : null,
    };
  }),

  // Fresh 5-minute link to the signed PDF.
  agreementUrl: adminProcedure.input(idInput).mutation(async ({ input }) => {
    const p = await getPartner(input.id);
    if (!p.agreementKey) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No agreement file. Regenerate it." });
    }
    const safeName = p.fullName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      url: await presignPrivateGet(p.agreementKey, {
        filename: `partner-agreement-${safeName || "partner"}.pdf`,
      }),
    };
  }),

  // Re-renders the PDF from the stored signature (only when the upload at
  // apply time failed; never to change what was signed).
  regenerateAgreement: adminProcedure.input(idInput).mutation(async ({ input }) => {
    const p = await getPartner(input.id);
    if (p.agreementKey) return { ok: true };
    const pdf = await renderPartnerAgreement({
      fullName: p.fullName,
      email: p.email,
      signature: p.signature,
      initials: p.initials,
      signedAt: p.signedAt,
      version: p.agreementVersion,
      ip: p.signedIp,
    });
    const key = agreementKey(p.id, p.pdfToken);
    await putPrivateObject(key, new Uint8Array(pdf), "application/pdf");
    await db.update(partner).set({ agreementKey: key }).where(eq(partner.id, p.id));
    return { ok: true };
  }),

  // Live "Available / Taken" check for the approve and change-code dialog.
  codeAvailable: adminProcedure
    .input(z.object({ id: z.uuid(), code: z.string().max(60) }))
    .query(async ({ input }) => {
      const problem = partnerCodeError(input.code);
      if (problem) return { code: null, available: false, problem };
      const code = normalizePartnerCode(input.code);
      return { code, available: !(await isPartnerCodeTaken(code, input.id)), problem: null };
    }),

  // Approve with the code Ali chose, then email it to the partner.
  approve: adminProcedure.input(idInput.extend({ code: codeInput })).mutation(async ({ input }) => {
    const p = await getPartner(input.id);
    const code = input.code;
    await setUniqueCode(p.id, code);
    await db
      .update(partner)
      .set({ status: "approved", approvedAt: new Date(), rejectedAt: null })
      .where(eq(partner.id, p.id));
    try {
      await sendPartnerApproved({
        fullName: p.fullName,
        email: p.email,
        code,
        pdfUrl: agreementUrl(p.pdfToken),
      });
    } catch (err) {
      throw emailError(err);
    }
    return { code };
  }),

  // Change an approved partner's code. The old code stops matching at once;
  // `notify` emails the new one.
  setCode: adminProcedure
    .input(idInput.extend({ code: codeInput, notify: z.boolean() }))
    .mutation(async ({ input }) => {
      const p = await getPartner(input.id);
      await setUniqueCode(p.id, input.code);
      if (input.notify && p.status === "approved") {
        try {
          await sendPartnerApproved({
            fullName: p.fullName,
            email: p.email,
            code: input.code,
            pdfUrl: agreementUrl(p.pdfToken),
          });
        } catch (err) {
          throw emailError(err);
        }
      }
      return { code: input.code };
    }),

  resendCode: adminProcedure.input(idInput).mutation(async ({ input }) => {
    const p = await getPartner(input.id);
    if (p.status !== "approved" || !p.code) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Approve the partner first." });
    }
    try {
      await sendPartnerApproved({
        fullName: p.fullName,
        email: p.email,
        code: p.code,
        pdfUrl: agreementUrl(p.pdfToken),
      });
    } catch (err) {
      throw emailError(err);
    }
    return { ok: true };
  }),

  // Rejecting keeps the code (if any) reserved but inactive: codes only
  // match approved partners.
  reject: adminProcedure
    .input(idInput.extend({ notify: z.boolean() }))
    .mutation(async ({ input }) => {
      const p = await getPartner(input.id);
      await db
        .update(partner)
        .set({ status: "rejected", rejectedAt: new Date() })
        .where(eq(partner.id, p.id));
      if (input.notify) {
        try {
          await sendPartnerRejected({ fullName: p.fullName, email: p.email });
        } catch (err) {
          throw emailError(err);
        }
      }
      return { ok: true };
    }),

  update: adminProcedure
    .input(
      idInput.extend({
        phone: optText(40).optional(),
        payoutMethod: optText(300).optional(),
        notes: optText(5000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...patch } = input;
      await getPartner(id);
      await db.update(partner).set(patch).where(eq(partner.id, id));
      return { ok: true };
    }),

  // Hard delete: referrals cascade, the signed PDF is removed best effort.
  delete: adminProcedure.input(idInput).mutation(async ({ input }) => {
    const p = await getPartner(input.id);
    const receipts = await db
      .select({ key: partnerReferral.payoutReceiptKey })
      .from(partnerReferral)
      .where(and(eq(partnerReferral.partnerId, p.id), isNotNull(partnerReferral.payoutReceiptKey)));
    await db.delete(partner).where(eq(partner.id, p.id));
    await Promise.all(receipts.map((r) => dropReceipt(r.key)));
    if (p.agreementKey) {
      await deletePrivateObject(p.agreementKey).catch((err) =>
        console.error("[partners] agreement delete failed", err)
      );
    }
    return { ok: true };
  }),

  // ─── Referrals ─────────────────────────────────────────────────

  // Admin partner page: this partner referred `projectId`.
  addReferral: adminProcedure
    .input(z.object({ partnerId: z.uuid(), projectId: z.uuid(), priceCents: centsInput }))
    .mutation(({ input }) => assignProjectReferral({ ...input, allowMove: false })),

  // A form lead (code typed on the agency site) became this project.
  linkProject: adminProcedure
    .input(referralIdInput.extend({ projectId: z.uuid(), priceCents: centsInput }))
    .mutation(async ({ input }) => {
      const r = await getReferral(input.referralId);
      const project = await getProject(input.projectId);
      const [taken] = await db
        .select({ id: partnerReferral.id })
        .from(partnerReferral)
        .where(eq(partnerReferral.projectId, input.projectId))
        .limit(1);
      if (taken && taken.id !== r.id) {
        throw new TRPCError({ code: "CONFLICT", message: "That project is already referred." });
      }
      await db
        .update(partnerReferral)
        .set({
          projectId: project.id,
          priceCents: input.priceCents,
          businessName: projectDisplayName(project),
          status: "won",
        })
        .where(eq(partnerReferral.id, r.id));
      return { ok: true };
    }),

  updateReferral: adminProcedure
    .input(
      referralIdInput.extend({
        status: z.enum(PARTNER_REFERRAL_STATUS_VALUES).optional(),
        notes: optText(2000).optional(),
        priceCents: centsInput.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { referralId, ...patch } = input;
      await getReferral(referralId);
      await db.update(partnerReferral).set(patch).where(eq(partnerReferral.id, referralId));
      return { ok: true };
    }),

  // ─── Hub Sites table (admin) ───────────────────────────────────

  // projectId -> referring partner, for the "Referred by" badge.
  projectReferrals: adminProcedure.query(() =>
    db
      .select({
        projectId: partnerReferral.projectId,
        referralId: partnerReferral.id,
        partnerId: partner.id,
        partnerName: partner.fullName,
        code: partner.code,
        priceCents: partnerReferral.priceCents,
        hasPayments: partnerReferral.clientPaidAt,
      })
      .from(partnerReferral)
      .innerJoin(partner, eq(partner.id, partnerReferral.partnerId))
      .where(isNotNull(partnerReferral.projectId))
      .then((rows) =>
        rows.map((r) => ({ ...r, projectId: r.projectId!, hasPayments: !!r.hasPayments }))
      )
  ),

  approvedPartners: adminProcedure.query(() =>
    db
      .select({ id: partner.id, fullName: partner.fullName, code: partner.code })
      .from(partner)
      .where(eq(partner.status, "approved"))
      .orderBy(asc(partner.fullName))
  ),

  // Set (or move) the referring partner of a project.
  setProjectReferral: adminProcedure
    .input(z.object({ projectId: z.uuid(), partnerId: z.uuid(), priceCents: centsInput }))
    .mutation(({ input }) => assignProjectReferral({ ...input, allowMove: true })),

  // Remove a project's referral; blocked once payments are recorded.
  removeProjectReferral: adminProcedure
    .input(z.object({ projectId: z.uuid() }))
    .mutation(async ({ input }) => {
      const [r] = await db
        .select()
        .from(partnerReferral)
        .where(eq(partnerReferral.projectId, input.projectId))
        .limit(1);
      if (!r) return { ok: true };
      if (hasPayments(r)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This referral has payments recorded. Undo them first.",
        });
      }
      await db.delete(partnerReferral).where(eq(partnerReferral.id, r.id));
      return { ok: true };
    }),

  // Projects for the admin "Add referral" picker, with who referred each.
  projects: adminProcedure.query(async () => {
    const [projects, referred] = await Promise.all([
      db
        .select({ id: hubProject.id, repo: hubProject.repo, websiteUrl: hubProject.websiteUrl })
        .from(hubProject)
        .where(eq(hubProject.hidden, false))
        .orderBy(asc(hubProject.repo)),
      db
        .select({ projectId: partnerReferral.projectId, partnerName: partner.fullName })
        .from(partnerReferral)
        .innerJoin(partner, eq(partner.id, partnerReferral.partnerId))
        .where(isNotNull(partnerReferral.projectId)),
    ]);
    const by = new Map(referred.map((r) => [r.projectId!, r.partnerName]));
    return projects
      .map((p) => ({
        projectId: p.id,
        name: projectDisplayName(p),
        repo: p.repo,
        referredBy: by.get(p.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }),

  deleteReferral: adminProcedure.input(referralIdInput).mutation(async ({ input }) => {
    const r = await getReferral(input.referralId);
    await db.delete(partnerReferral).where(eq(partnerReferral.id, r.id));
    await dropReceipt(r.payoutReceiptKey);
    return { ok: true };
  }),

  // The client paid for its website. Commission defaults to 40%.
  markClientPaid: adminProcedure
    .input(
      referralIdInput.extend({
        // Defaults to the website price set on the referral.
        amountCents: centsInput.optional(),
        commissionCents: z.number().int().min(0).max(10_000_000).optional(),
        paidAt: z.coerce.date(),
        method: z.enum(CLIENT_PAYMENT_METHODS),
      })
    )
    .mutation(async ({ input }) => {
      const r = await getReferral(input.referralId);
      const amount = input.amountCents ?? r.priceCents;
      if (!amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter the amount the client paid." });
      }
      await db
        .update(partnerReferral)
        .set({
          clientPaidCents: amount,
          clientPaidAt: input.paidAt,
          clientPaymentMethod: input.method,
          commissionCents: input.commissionCents ?? commissionFor(amount),
          status: "won",
        })
        .where(eq(partnerReferral.id, input.referralId));
      return { ok: true };
    }),

  unmarkClientPaid: adminProcedure.input(referralIdInput).mutation(async ({ input }) => {
    const r = await getReferral(input.referralId);
    if (r.partnerPaidAt) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Undo the partner payout first.",
      });
    }
    await db
      .update(partnerReferral)
      .set({
        clientPaidCents: null,
        clientPaidAt: null,
        clientPaymentMethod: null,
        commissionCents: null,
      })
      .where(eq(partnerReferral.id, input.referralId));
    return { ok: true };
  }),

  markPartnerPaid: adminProcedure
    .input(
      referralIdInput.extend({
        paidAt: z.coerce.date(),
        reference: optText(200),
        // Required proof of payout: screenshot or PDF, base64, max 10 MB.
        receipt: z.object({
          name: z.string().trim().min(1).max(200),
          type: z.enum(RECEIPT_TYPES),
          data: z.string().min(1).max(Math.ceil((RECEIPT_MAX_BYTES * 4) / 3) + 4),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const r = await getReferral(input.referralId);
      if (!r.clientPaidAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Mark the client as paid first.",
        });
      }
      const body = new Uint8Array(Buffer.from(input.receipt.data, "base64"));
      if (!body.length || body.length > RECEIPT_MAX_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Receipt must be a file up to 10 MB." });
      }
      const key = receiptKey(r.partnerId, r.id, input.receipt.type);
      await putPrivateObject(key, body, input.receipt.type);
      try {
        await db
          .update(partnerReferral)
          .set({
            partnerPaidAt: input.paidAt,
            payoutReference: input.reference,
            payoutReceiptKey: key,
            payoutReceiptName: input.receipt.name,
          })
          .where(eq(partnerReferral.id, r.id));
      } catch (err) {
        await dropReceipt(key);
        throw err;
      }
      // Replaced receipt (marked paid again without undo): remove the old one.
      if (r.payoutReceiptKey && r.payoutReceiptKey !== key) await dropReceipt(r.payoutReceiptKey);
      return { ok: true };
    }),

  // Fresh 5-minute link to the payout receipt.
  payoutReceiptUrl: adminProcedure.input(referralIdInput).mutation(async ({ input }) => {
    const r = await getReferral(input.referralId);
    if (!r.payoutReceiptKey) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No receipt uploaded for this payout." });
    }
    return { url: await presignPrivateGet(r.payoutReceiptKey) };
  }),

  // Undo also deletes the receipt; marking paid again needs a new one.
  unmarkPartnerPaid: adminProcedure.input(referralIdInput).mutation(async ({ input }) => {
    const r = await getReferral(input.referralId);
    await db
      .update(partnerReferral)
      .set({ partnerPaidAt: null, payoutReference: null, payoutReceiptKey: null, payoutReceiptName: null })
      .where(eq(partnerReferral.id, r.id));
    await dropReceipt(r.payoutReceiptKey);
    return { ok: true };
  }),

});

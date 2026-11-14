import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { agencyLead, hubProject } from "@workspace/drizzle/schema";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  cmsWriteProcedure,
  createTRPCRouter,
} from "../init";
import { classifyLead } from "../lib/agency/lead-channel";
import {
  createWixDraftPost,
  deleteWixDraftPost,
  firstWixMemberId,
  forgetWixToken,
  formatWixAddress,
  getWixDraftPost,
  getWixSiteProperties,
  isWixConfigured,
  listWixBookings,
  listWixContacts,
  listWixDraftPosts,
  listWixForms,
  listWixInstalledApps,
  listWixLivePosts,
  listWixOrders,
  listWixSiteUrls,
  listWixSubmissions,
  markdownToRicos,
  publishWixDraftPost,
  ricosToMarkdown,
  updateWixDraftPost,
  wixTokenFor,
} from "../lib/wix";
import {
  WIX_APPS,
  isMarkdownSafe,
  signWixState,
  submissionToLead,
  type WixAppKey,
} from "../lib/wix-shared";

// The project's Wix app: the client installs the hub's Wix app on one of
// their Wix sites (Wix shows its own site picker), and the hub then reads
// that site's info, manages its blog, imports form submissions into Leads
// and shows contacts, orders and bookings. Installing happens in
// apps/api/app/api/wix/callback (verifies Wix's signed instance).

const projectRow = async (projectId: string) => {
  const [row] = await db
    .select({
      wixInstanceId: hubProject.wixInstanceId,
      wixSiteId: hubProject.wixSiteId,
      apps: hubProject.apps,
      websiteUrl: hubProject.websiteUrl,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
};

const siteToken = async (projectId: string) => {
  const row = await projectRow(projectId);
  if (!row.wixInstanceId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect Wix first." });
  }
  return { row, token: await wixTokenFor(row.wixInstanceId) };
};

const contactName = (first?: string, last?: string) =>
  [first, last].filter(Boolean).join(" ") || null;

const blogRouter = createTRPCRouter({
  // Live posts and drafts that aren't live are two separate Wix queries;
  // every post shows up in exactly one.
  list: cmsProcedure.query(async ({ ctx }) => {
    const { token } = await siteToken(ctx.projectId);
    const [live, drafts] = await Promise.all([
      listWixLivePosts(token),
      listWixDraftPosts(token),
    ]);
    return [
      ...live.map((p) => ({
        id: p.id,
        title: p.title,
        status: "published" as const,
        pendingChanges: !!p.hasUnpublishedChanges,
        updatedAt: p.lastPublishedDate ?? p.firstPublishedDate ?? null,
        views: p.metrics?.views ?? null,
        url: p.url?.base && p.url.path ? `${p.url.base}${p.url.path}` : null,
      })),
      ...drafts.map((p) => ({
        id: p.id,
        title: p.title,
        status: "draft" as const,
        pendingChanges: false,
        updatedAt: p.editedDate ?? null,
        views: null,
        url: null,
      })),
    ];
  }),

  get: cmsProcedure
    .input(z.object({ id: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const { token } = await siteToken(ctx.projectId);
      const post = await getWixDraftPost(token, input.id);
      const nodes = (post.richContent?.nodes ?? []) as { type?: string }[];
      const bodyEditable = isMarkdownSafe(nodes);
      return {
        id: post.id,
        title: post.title,
        excerpt: post.excerpt ?? "",
        published: post.status === "PUBLISHED",
        pendingChanges: !!post.hasUnpublishedChanges,
        bodyEditable,
        markdown: bodyEditable && nodes.length ? await ricosToMarkdown(token, nodes) : "",
      };
    }),

  // markdown undefined = keep the body as it is (posts with images etc.).
  save: cmsWriteProcedure
    .input(
      z.object({
        id: z.string().min(1).max(100).optional(),
        title: z.string().trim().min(1).max(200),
        excerpt: z.string().trim().max(500),
        markdown: z.string().max(10000).optional(),
        publish: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token } = await siteToken(ctx.projectId);
      const richContent =
        input.markdown !== undefined ? await markdownToRicos(token, input.markdown) : undefined;

      if (!input.id) {
        const memberId = await firstWixMemberId(token);
        if (!memberId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Your Wix site needs at least one member to own blog posts. Write the first post in Wix.",
          });
        }
        const created = await createWixDraftPost(
          token,
          {
            title: input.title,
            excerpt: input.excerpt || undefined,
            memberId,
            ...(richContent ? { richContent } : {}),
          },
          input.publish
        );
        return { id: created.id };
      }

      const current = await getWixDraftPost(token, input.id);
      const live = current.status === "PUBLISHED";
      await updateWixDraftPost(
        token,
        {
          id: input.id,
          memberId: current.memberId,
          title: input.title,
          excerpt: input.excerpt,
          ...(richContent ? { richContent } : {}),
        },
        live && input.publish ? "UPDATE_PUBLISH" : undefined
      );
      if (!live && input.publish) await publishWixDraftPost(token, input.id);
      return { id: input.id };
    }),

  // Wix keeps deleted posts in its trash (restorable). A live post is
  // taken off the blog first, as Wix requires.
  remove: cmsWriteProcedure
    .input(z.object({ id: z.string().min(1).max(100), published: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { token } = await siteToken(ctx.projectId);
      if (input.published) {
        await updateWixDraftPost(token, { id: input.id }, "UPDATE_REVERT_TO_DRAFT");
      }
      await deleteWixDraftPost(token, input.id);
      return { ok: true };
    }),
});

const formsRouter = createTRPCRouter({
  list: cmsProcedure.query(async ({ ctx }) => {
    const { token } = await siteToken(ctx.projectId);
    const [forms, submissions] = await Promise.all([
      listWixForms(token),
      listWixSubmissions(token),
    ]);
    const formName = new Map(forms.map((f) => [f.id, f.name ?? null]));
    const imported = submissions.length
      ? await db
          .select({ externalId: agencyLead.externalId })
          .from(agencyLead)
          .where(
            and(
              eq(agencyLead.projectId, ctx.projectId),
              inArray(
                agencyLead.externalId,
                submissions.map((s) => `wix:${s.id}`)
              )
            )
          )
      : [];
    const done = new Set(imported.map((i) => i.externalId));
    return submissions.map((s) => {
      const lead = submissionToLead(s.submissions ?? {});
      return {
        id: s.id,
        form: formName.get(s.formId) ?? null,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        createdAt: s.createdDate ?? null,
        imported: done.has(`wix:${s.id}`),
      };
    });
  }),

  // Idempotent: each submission becomes at most one lead (external_id).
  syncToLeads: cmsWriteProcedure.mutation(async ({ ctx }) => {
    const { row, token } = await siteToken(ctx.projectId);
    if (!(row.apps ?? []).includes("leads")) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Add the Leads app first." });
    }
    const [forms, submissions] = await Promise.all([
      listWixForms(token),
      listWixSubmissions(token),
    ]);
    const formName = new Map(forms.map((f) => [f.id, f.name ?? null]));
    const values = submissions
      .filter((s) => s.status !== "PENDING")
      .map((s) => {
        const lead = submissionToLead(s.submissions ?? {});
        const created = s.createdDate ? new Date(s.createdDate) : new Date();
        return {
          projectId: ctx.projectId,
          source: "wix" as const,
          status: "new" as const,
          externalId: `wix:${s.id}`,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          fields: Object.keys(lead.rest).length ? lead.rest : null,
          formName: formName.get(s.formId) ?? "Wix form",
          channel: classifyLead({ source: "form" }),
          createdAt: Number.isNaN(created.getTime()) ? new Date() : created,
        };
      })
      .filter((v) => v.name || v.email || v.phone || v.message || v.fields);
    if (!values.length) return { imported: 0 };
    const inserted = await db
      .insert(agencyLead)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: agencyLead.id });
    return { imported: inserted.length };
  }),
});

export const wixRouter = createTRPCRouter({
  status: cmsProcedure.query(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    return { connected: !!row.wixInstanceId, configured: isWixConfigured() };
  }),

  // Wix's installer: site picker + permissions, then back to our callback.
  installUrl: cmsFullAccessProcedure.mutation(({ ctx }) => {
    if (!isWixConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The Wix app isn't set up yet.",
      });
    }
    const state = signWixState(
      { projectId: ctx.projectId, userId: ctx.user.id },
      process.env.BETTER_AUTH_SECRET ?? ""
    );
    const callback = new URL("/api/wix/callback", process.env.NEXT_PUBLIC_API_URL);
    callback.searchParams.set("state", state);
    const url = new URL("https://www.wix.com/app-installer");
    url.searchParams.set("appId", process.env.WIX_APP_ID ?? "");
    url.searchParams.set("shareUrlId", process.env.WIX_SHARE_URL_ID ?? "");
    url.searchParams.set("postInstallationUrl", callback.toString());
    return { url: url.toString() };
  }),

  // Apps can't be uninstalled through the API: unbind here, and the client
  // removes the app from the site in Wix.
  disconnect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    if (row.wixInstanceId) forgetWixToken(row.wixInstanceId);
    await db
      .update(hubProject)
      .set({ wixInstanceId: null, wixSiteId: null, wixConnectedUserId: null })
      .where(eq(hubProject.id, ctx.projectId));
    return {
      manageAppsUrl: row.wixSiteId
        ? `https://manage.wix.com/dashboard/${row.wixSiteId}/manage-installed-apps`
        : null,
    };
  }),

  overview: cmsProcedure.query(async ({ ctx }) => {
    const { row, token } = await siteToken(ctx.projectId);
    const [props, urls, installed] = await Promise.all([
      getWixSiteProperties(token),
      listWixSiteUrls(token).catch(() => []),
      listWixInstalledApps(token).catch(() => []),
    ]);
    const known = installed
      .filter((a) => a.enabled !== false && WIX_APPS[a.appDefId])
      .map((a) => WIX_APPS[a.appDefId]!);
    const apps = [...new Map(known.map((a) => [a.key, a])).values()];
    return {
      siteName: props.siteDisplayName ?? props.businessName ?? null,
      businessName: props.businessName ?? null,
      email: props.email ?? null,
      phone: props.phone ?? null,
      address: formatWixAddress(props.address),
      siteUrl: (urls.find((u) => u.primary) ?? urls[0])?.url ?? null,
      dashboardUrl: row.wixSiteId ? `https://manage.wix.com/dashboard/${row.wixSiteId}` : null,
      apps: apps as { key: WixAppKey; name: string }[],
    };
  }),

  blog: blogRouter,
  forms: formsRouter,

  contacts: cmsProcedure
    .input(z.object({ offset: z.number().int().min(0).max(100_000) }))
    .query(async ({ ctx, input }) => {
      const { token } = await siteToken(ctx.projectId);
      const { contacts, total } = await listWixContacts(token, input.offset);
      return {
        total,
        contacts: contacts.map((c) => ({
          id: c.id,
          name: contactName(c.info?.name?.first, c.info?.name?.last),
          email: c.primaryInfo?.email ?? null,
          phone: c.primaryInfo?.phone ?? null,
          createdAt: c.createdDate ?? null,
        })),
      };
    }),

  orders: cmsProcedure.query(async ({ ctx }) => {
    const { token } = await siteToken(ctx.projectId);
    const orders = await listWixOrders(token);
    return orders.map((o) => ({
      id: o.id,
      number: o.number ?? null,
      createdAt: o.createdDate ?? null,
      customer:
        contactName(
          o.billingInfo?.contactDetails?.firstName,
          o.billingInfo?.contactDetails?.lastName
        ) ??
        o.buyerInfo?.email ??
        null,
      total: o.priceSummary?.total?.formattedAmount ?? null,
      paymentStatus: o.paymentStatus ?? null,
      fulfillmentStatus: o.fulfillmentStatus ?? null,
    }));
  }),

  bookings: cmsProcedure.query(async ({ ctx }) => {
    const { token } = await siteToken(ctx.projectId);
    const bookings = await listWixBookings(token);
    return bookings
      .filter((b) => b.booking)
      .map(({ booking: b }) => ({
        id: b!.id,
        service: b!.bookedEntity?.title ?? null,
        startAt: b!.startDate ?? null,
        endAt: b!.endDate ?? null,
        status: b!.status ?? null,
        customer:
          contactName(b!.contactDetails?.firstName, b!.contactDetails?.lastName) ??
          b!.contactDetails?.email ??
          null,
      }));
  }),
});

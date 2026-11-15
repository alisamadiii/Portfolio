import { TRPCError } from "@trpc/server";
import z from "zod";

import { requireFeature } from "@workspace/trpc/lib/payment/entitlements";

import { isAdminUser } from "../lib/authz-shared";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  cmsWriteProcedure,
  createTRPCRouter,
} from "../init";
import {
  createProjectDomain,
  deleteProjectDomain,
  workspaceReady,
  projectDomain,
  projectMail,
  clearDefaultList,
  resolveList,
  setUpWorkspace,
  starterContent,
  teamFetch,
  verifiedDomain,
  type ProjectMail,
} from "../lib/newsletter";
import {
  buildFrom,
  CONTACT_IMPORT_CHUNK,
  normalizeDomain,
  parseFrom,
  rate,
} from "../lib/newsletter-shared";

// The Newsletter app: the project's useSend workspace (campaigns, contacts,
// templates, suppressions, one sending domain, analytics). Isolation lives in
// lib/newsletter.ts: every call uses the project's own team key, so client ids
// can't reach another workspace. Every procedure also needs the plan feature.

const DOMAIN_REGION = process.env.USESEND_DOMAIN_REGION ?? "us-west-2";

type Ctx = {
  user: { email: string; role?: string | null };
  projectId: string;
  owner: string;
  repo: string;
};

const mailFor = async (ctx: Ctx): Promise<ProjectMail> => {
  await requireFeature(ctx.user, ctx.projectId, "newsletter");
  return projectMail(ctx.projectId);
};

const read = cmsProcedure;
const write = cmsWriteProcedure;
const manage = cmsFullAccessProcedure;

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const page = z.number().int().min(1).max(10_000).default(1);

type CampaignRow = {
  id: string;
  name: string;
  from: string;
  subject: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  total: number;
  sent: number;
  delivered: number;
  unsubscribed: number;
};

type CampaignDetail = CampaignRow & {
  previewText: string | null;
  contactBookId: string | null;
  content: string | null;
  html: string | null;
  opened: number;
  clicked: number;
  bounced: number;
  hardBounced: number;
  complained: number;
};

type Series = {
  result: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  }[];
  totalCounts: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  };
};

type ContactList = {
  contacts: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    subscribed: boolean;
    createdAt: string;
  }[];
  total: number;
  subscribed: number;
  unsubscribed: number;
};

/** Analytics only count mail from the project's own domain (not form notifications). */
const series = async (mail: ProjectMail, days: 7 | 30): Promise<Series | null> => {
  const domain = await projectDomain(mail);
  if (!domain) return null;
  return teamFetch<Series>(mail, "/api/v1/analytics/email-time-series", {
    query: { days: String(days), domainId: String(domain.id) },
  });
};

/** Campaign "from" must be on the project's verified domain. */
const fromInput = z.object({
  fromName: z.string().max(80),
  localPart: z.string().min(1).max(64),
});

const resolveFrom = async (mail: ProjectMail, input: z.infer<typeof fromInput>) => {
  const domain = await verifiedDomain(mail);
  try {
    return buildFrom(input.fromName, input.localPart, domain.name);
  } catch (error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: (error as Error).message });
  }
};

const businessName = (ctx: Ctx) => ctx.repo;

const listId = id.optional();

const campaignsRouter = createTRPCRouter({
  list: read
    .input(z.object({ page, status: z.enum(["DRAFT", "SCHEDULED", "RUNNING", "PAUSED", "SENT"]).optional() }))
    .query(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      return teamFetch<{ campaigns: CampaignRow[]; totalPage: number }>(mail, "/api/v1/campaigns", {
        query: { page: String(input.page), status: input.status },
      });
    }),

  get: read.input(z.object({ campaignId: id })).query(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    const campaign = await teamFetch<CampaignDetail>(mail, `/api/v1/campaigns/${input.campaignId}`);
    return { ...campaign, fromParts: parseFrom(campaign.from) };
  }),

  recipients: read.input(z.object({ campaignId: id })).query(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    return teamFetch<{ id: string; to: string[]; latestStatus: string; updatedAt: string }[]>(
      mail,
      `/api/v1/campaigns/${input.campaignId}/emails`,
      { query: { limit: "50" } }
    );
  }),

  create: write
    .input(
      fromInput.extend({
        name: z.string().trim().min(1).max(200),
        subject: z.string().trim().min(1).max(500),
        templateId: id.optional(),
        listId,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const from = await resolveFrom(mail, input);
      const contactBookId = await resolveList(mail, input.listId);
      let content = starterContent(businessName(ctx));
      if (input.templateId) {
        const template = await teamFetch<{ content: string | null }>(
          mail,
          `/api/v1/templates/${input.templateId}`
        );
        if (template.content) content = template.content;
      }
      try {
        const campaign = await teamFetch<{ id: string }>(mail, "/api/v1/campaigns", {
          method: "POST",
          body: { name: input.name, subject: input.subject, from, contactBookId, content },
        });
        return { id: campaign.id };
      } catch (error) {
        // A template without the unsubscribe footer: fall back to the starter.
        if (input.templateId && error instanceof TRPCError && error.code === "BAD_REQUEST") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That template has no unsubscribe link. Add one in the template first.",
          });
        }
        throw error;
      }
    }),

  update: write
    .input(
      z.object({
        campaignId: id,
        name: z.string().trim().min(1).max(200).optional(),
        subject: z.string().trim().max(500).optional(),
        previewText: z.string().max(500).optional(),
        content: z.string().max(2_000_000).optional(),
        from: fromInput.optional(),
        listId,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const { campaignId, from, listId: list, ...rest } = input;
      const body: Record<string, unknown> = { ...rest };
      if (from) body.from = await resolveFrom(mail, from);
      // The fork checks the list belongs to this team.
      if (list) body.contactBookId = list;
      await teamFetch(mail, `/api/v1/campaigns/${campaignId}`, { method: "PATCH", body });
      return { ok: true };
    }),

  schedule: manage
    .input(z.object({ campaignId: id, scheduledAt: z.string().datetime().optional() }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const domain = await verifiedDomain(mail);
      const campaign = await teamFetch<CampaignDetail>(mail, `/api/v1/campaigns/${input.campaignId}`);
      if (parseFrom(campaign.from).domain.toLowerCase() !== domain.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Send from an address @${domain.name}.`,
        });
      }
      if (input.scheduledAt && new Date(input.scheduledAt).getTime() < Date.now() - 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a time in the future." });
      }
      await teamFetch(mail, `/api/v1/campaigns/${input.campaignId}/schedule`, {
        method: "POST",
        body: input.scheduledAt ? { scheduledAt: input.scheduledAt } : {},
      });
      return { ok: true };
    }),

  pause: write.input(z.object({ campaignId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    await teamFetch(mail, `/api/v1/campaigns/${input.campaignId}/pause`, { method: "POST" });
    return { ok: true };
  }),

  resume: manage.input(z.object({ campaignId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    await teamFetch(mail, `/api/v1/campaigns/${input.campaignId}/resume`, { method: "POST" });
    return { ok: true };
  }),

  duplicate: write.input(z.object({ campaignId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    return teamFetch<{ id: string }>(mail, `/api/v1/campaigns/${input.campaignId}/duplicate`, {
      method: "POST",
    });
  }),

  delete: write.input(z.object({ campaignId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    await teamFetch(mail, `/api/v1/campaigns/${input.campaignId}`, { method: "DELETE" });
    return { ok: true };
  }),
});

const contactFields = {
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
};

const contactsRouter = createTRPCRouter({
  /** New list. Double opt-in is always off: adding contacts must never email them. */
  createList: write
    .input(z.object({ name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const book = await teamFetch<{ id: string; name: string }>(mail, "/api/v1/contactBooks", {
        method: "POST",
        body: { name: input.name, doubleOptInEnabled: false },
      });
      return { id: book.id, name: book.name };
    }),

  renameList: write
    .input(z.object({ listId: id, name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      await teamFetch(mail, `/api/v1/contactBooks/${input.listId}`, {
        method: "PATCH",
        body: { name: input.name },
      });
      return { ok: true };
    }),

  /** Deletes a list and its contacts (confirmed in the UI). */
  deleteList: manage.input(z.object({ listId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    await teamFetch(mail, `/api/v1/contactBooks/${input.listId}`, { method: "DELETE" });
    if (mail.contactBookId === input.listId) await clearDefaultList(mail.projectId, input.listId);
    return { ok: true };
  }),

  /** Every list in the project's workspace, with counts. Default list first. */
  lists: read.query(async ({ ctx }) => {
    const mail = await mailFor(ctx);
    const books = await teamFetch<{ id: string; name: string; emoji?: string | null }[]>(
      mail,
      "/api/v1/contactBooks"
    );
    const lists = await Promise.all(
      books.map(async (b) => {
        const counts = await teamFetch<ContactList>(mail, `/api/v1/contactBooks/${b.id}/contact-list`, {
          query: { limit: "1" },
        });
        return {
          id: b.id,
          name: b.name.trim() || "Untitled",
          emoji: b.emoji ?? null,
          total: counts.total,
          subscribed: counts.subscribed,
          isDefault: b.id === mail.contactBookId,
        };
      })
    );
    // Biggest list first: it's what the client means by "my subscribers".
    return lists.sort((a, b) => b.total - a.total);
  }),

  list: read
    .input(
      z.object({
        listId,
        page,
        search: z.string().trim().max(200).optional(),
        subscribed: z.enum(["true", "false"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const book = await resolveList(mail, input.listId);
      return teamFetch<ContactList>(mail, `/api/v1/contactBooks/${book}/contact-list`, {
        query: {
          page: String(input.page),
          limit: "50",
          search: input.search || undefined,
          subscribed: input.subscribed,
        },
      });
    }),

  add: write
    .input(z.object({ listId, email: z.string().trim().toLowerCase().email(), ...contactFields }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const book = await resolveList(mail, input.listId);
      return teamFetch<{ contactId: string }>(mail, `/api/v1/contactBooks/${book}/contacts`, {
        method: "POST",
        body: { ...input, subscribed: true },
      });
    }),

  update: write
    .input(z.object({ listId, contactId: id, subscribed: z.boolean().optional(), ...contactFields }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const book = await resolveList(mail, input.listId);
      const { contactId, listId: _list, ...body } = input;
      await teamFetch(mail, `/api/v1/contactBooks/${book}/contacts/${contactId}`, {
        method: "PATCH",
        body,
      });
      return { ok: true };
    }),

  delete: write
    .input(z.object({ listId, contactIds: z.array(id).min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const book = await resolveList(mail, input.listId);
      await teamFetch(mail, `/api/v1/contactBooks/${book}/contacts/bulk`, {
        method: "DELETE",
        body: { contactIds: input.contactIds },
      });
      return { ok: true };
    }),

  /** One chunk of a CSV import; the hub sends ≤1000 rows per call. */
  import: write
    .input(
      z.object({
        listId,
        rows: z
          .array(z.object({ email: z.string().trim().toLowerCase().email(), ...contactFields }))
          .min(1)
          .max(CONTACT_IMPORT_CHUNK),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const book = await resolveList(mail, input.listId);
      await teamFetch(mail, `/api/v1/contactBooks/${book}/contacts/bulk`, {
        method: "POST",
        body: input.rows.map((r) => ({ ...r, subscribed: true })),
      });
      return { imported: input.rows.length };
    }),
});

type TemplateRow = {
  id: string;
  name: string;
  subject: string;
  html: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
};

const templatesRouter = createTRPCRouter({
  list: read.input(z.object({ page })).query(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    return teamFetch<{ templates: TemplateRow[]; totalPage: number }>(mail, "/api/v1/templates", {
      query: { page: String(input.page) },
    });
  }),

  get: read.input(z.object({ templateId: id })).query(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    return teamFetch<TemplateRow>(mail, `/api/v1/templates/${input.templateId}`);
  }),

  create: write
    .input(z.object({ name: z.string().trim().min(1).max(200), subject: z.string().trim().max(500) }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      return teamFetch<TemplateRow>(mail, "/api/v1/templates", {
        method: "POST",
        body: { ...input, content: starterContent(businessName(ctx)) },
      });
    }),

  update: write
    .input(
      z.object({
        templateId: id,
        name: z.string().trim().min(1).max(200).optional(),
        subject: z.string().trim().max(500).optional(),
        content: z.string().max(2_000_000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const { templateId, ...body } = input;
      await teamFetch(mail, `/api/v1/templates/${templateId}`, { method: "PATCH", body });
      return { ok: true };
    }),

  duplicate: write.input(z.object({ templateId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    return teamFetch<TemplateRow>(mail, `/api/v1/templates/${input.templateId}/duplicate`, {
      method: "POST",
    });
  }),

  delete: write.input(z.object({ templateId: id })).mutation(async ({ ctx, input }) => {
    const mail = await mailFor(ctx);
    await teamFetch(mail, `/api/v1/templates/${input.templateId}`, { method: "DELETE" });
    return { ok: true };
  }),
});

type Suppression = {
  id: string;
  email: string;
  reason: "HARD_BOUNCE" | "COMPLAINT" | "MANUAL";
  source: string | null;
  createdAt: string;
};

const suppressionsRouter = createTRPCRouter({
  list: read
    .input(
      z.object({
        page,
        search: z.string().trim().max(200).optional(),
        reason: z.enum(["HARD_BOUNCE", "COMPLAINT", "MANUAL"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const [list, stats] = await Promise.all([
        teamFetch<{ suppressions: Suppression[]; total: number }>(mail, "/api/v1/suppressions", {
          query: {
            page: String(input.page),
            limit: "50",
            search: input.search || undefined,
            reason: input.reason,
          },
        }),
        teamFetch<Record<Suppression["reason"], number>>(mail, "/api/v1/suppressions/stats"),
      ]);
      return { ...list, stats };
    }),

  add: manage
    .input(z.object({ emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      await teamFetch(mail, "/api/v1/suppressions", { method: "POST", body: input });
      return { ok: true };
    }),

  /** Only manual entries can be removed: bounces and complaints protect deliverability. */
  remove: manage
    .input(z.object({ email: z.string().trim().toLowerCase().email() }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const { suppressions } = await teamFetch<{ suppressions: Suppression[] }>(
        mail,
        "/api/v1/suppressions",
        { query: { search: input.email, limit: "20" } }
      );
      const entry = suppressions.find((s) => s.email.toLowerCase() === input.email);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Not on the list." });
      if (entry.reason !== "MANUAL") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Bounced and complaining addresses stay blocked to protect your sending.",
        });
      }
      await teamFetch(mail, "/api/v1/suppressions/remove", { method: "POST", body: input });
      return { ok: true };
    }),
});

const domainRouter = createTRPCRouter({
  get: read.query(async ({ ctx }) => {
    const mail = await mailFor(ctx);
    return projectDomain(mail);
  }),

  create: manage.input(z.object({ name: z.string().max(253) })).mutation(async ({ ctx, input }) => {
    const name = normalizeDomain(input.name);
    if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a domain like acme.com." });
    const mail = await mailFor(ctx);
    return createProjectDomain(mail, name, DOMAIN_REGION);
  }),

  verify: manage.mutation(async ({ ctx }) => {
    const mail = await mailFor(ctx);
    const domain = await projectDomain(mail);
    if (!domain) throw new TRPCError({ code: "NOT_FOUND", message: "Add your domain first." });
    await teamFetch(mail, `/api/v1/domains/${domain.id}/verify`, { method: "PUT" });
    return { ok: true };
  }),

  setTracking: manage
    .input(z.object({ clickTracking: z.boolean().optional(), openTracking: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const domain = await projectDomain(mail);
      if (!domain) throw new TRPCError({ code: "NOT_FOUND", message: "Add your domain first." });
      await teamFetch(mail, `/api/v1/domains/${domain.id}`, { method: "PATCH", body: input });
      return { ok: true };
    }),

  sendTest: manage.mutation(async ({ ctx }) => {
    const mail = await mailFor(ctx);
    const domain = await verifiedDomain(mail);
    await teamFetch(mail, "/api/v1/emails", {
      method: "POST",
      body: {
        to: ctx.user.email,
        from: `hello@${domain.name}`,
        subject: `Test email from ${domain.name}`,
        html: `<p>Hello,</p><p>Your domain <strong>${domain.name}</strong> is ready to send newsletters.</p>`,
        text: `Hello,\n\nYour domain ${domain.name} is ready to send newsletters.`,
      },
    });
    return { to: ctx.user.email };
  }),

  delete: manage.mutation(async ({ ctx }) => {
    const mail = await mailFor(ctx);
    await deleteProjectDomain(mail);
    return { ok: true };
  }),
});

export const newsletterRouter = createTRPCRouter({
  /** Whether the project's useSend workspace exists. The page shows "Set up" when not. */
  status: read.query(async ({ ctx }) => {
    await requireFeature(ctx.user, ctx.projectId, "newsletter");
    return { ready: await workspaceReady(ctx.projectId) };
  }),

  /** Creates the project's own workspace (idempotent). */
  setup: manage.mutation(async ({ ctx }) => {
    await requireFeature(ctx.user, ctx.projectId, "newsletter");
    await setUpWorkspace(ctx.projectId, `${ctx.owner}/${ctx.repo}`, isAdminUser(ctx.user));
    return { ready: true };
  }),

  /** Headline numbers. Anything we can't compute is null ("—" in the UI). */
  overview: read.query(async ({ ctx }) => {
    const mail = await mailFor(ctx);
    const domain = await projectDomain(mail);
    // Each number is independent: one failing call shows "—", not an error page.
    const soft = <T,>(p: Promise<T>) =>
      p.catch((error) => {
        console.error("newsletter.overview", ctx.projectId, (error as Error).message);
        return null;
      });
    const sentCount = async () => {
      const sent = await teamFetch<{ campaigns: CampaignRow[]; totalPage: number }>(
        mail,
        "/api/v1/campaigns",
        { query: { status: "SENT" } }
      );
      if (sent.totalPage <= 1) return sent.campaigns.length;
      const last = await teamFetch<{ campaigns: CampaignRow[] }>(mail, "/api/v1/campaigns", {
        query: { status: "SENT", page: String(sent.totalPage) },
      });
      return (sent.totalPage - 1) * 30 + last.campaigns.length;
    };
    const subscribers = async () => {
      const books = await teamFetch<{ id: string }[]>(mail, "/api/v1/contactBooks");
      const counts = await Promise.all(
        books.map((b) =>
          teamFetch<ContactList>(mail, `/api/v1/contactBooks/${b.id}/contact-list`, {
            query: { limit: "1" },
          })
        )
      );
      return { subscribed: counts.reduce((n, c) => n + c.subscribed, 0) };
    };
    const [list, campaignsSent, last30] = await Promise.all([
      soft(subscribers()),
      soft(sentCount()),
      domain ? soft(series(mail, 30)) : null,
    ]);
    const delivered = last30?.totalCounts.delivered ?? 0;
    return {
      subscribers: list ? list.subscribed : null,
      campaignsSent,
      openRate: last30 ? rate(last30.totalCounts.opened, delivered) : null,
      clickRate: last30 ? rate(last30.totalCounts.clicked, delivered) : null,
      domain: domain ? { name: domain.name, status: domain.status } : null,
    };
  }),

  analytics: read
    .input(z.object({ days: z.union([z.literal(7), z.literal(30)]).default(30) }))
    .query(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      const domain = await projectDomain(mail);
      if (!domain) return null;
      const [data, reputation] = await Promise.all([
        series(mail, input.days),
        teamFetch<{ bounceRate: number; complaintRate: number }>(
          mail,
          "/api/v1/analytics/reputation-metrics",
          { query: { domainId: String(domain.id) } }
        ),
      ]);
      return { ...data!, reputation };
    }),

  /** Presigned upload for images in the email editor (PUT with raw fetch). */
  imageUploadUrl: write
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mail = await mailFor(ctx);
      return teamFetch<{ uploadUrl: string; imageUrl: string }>(mail, "/api/v1/uploads/image-url", {
        method: "POST",
        body: input,
      });
    }),

  campaigns: campaignsRouter,
  contacts: contactsRouter,
  templates: templatesRouter,
  suppressions: suppressionsRouter,
  domain: domainRouter,
});

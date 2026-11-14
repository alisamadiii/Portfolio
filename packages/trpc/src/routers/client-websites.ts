import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { user as userTable } from "@workspace/drizzle/schema";

import { adminProcedure, createTRPCRouter } from "../init";
import { createUploadProjectFromFiles } from "../lib/cms/upload-project";
import { getWebsite, listKeys, listWebsites, readSiteFiles } from "../lib/client-websites";
import {
  createLink,
  createLinkSchema,
  expireLink,
  findCustomer,
  isStripeConfigured,
  listCatalog,
  listLinks,
} from "../lib/client-websites-payments";
import { SLUG } from "../lib/client-websites-shared";

// Admin only: the client website designs in the client-websites R2 bucket
// (hub /client-websites). Replaces the old apps/client-websites viewer.

const slugInput = z.object({ slug: z.string().regex(SLUG, "Invalid website") });

export const clientWebsitesRouter = createTRPCRouter({
  list: adminProcedure.query(() => listWebsites()),

  get: adminProcedure.input(slugInput).query(({ input }) => getWebsite(input.slug)),

  // Read per request so changing it on Coolify needs no rebuild.
  config: adminProcedure.query(() => ({
    originAddress: process.env.CLIENT_WEBSITES_ORIGIN_ADDRESS || null,
    stripeEnabled: isStripeConfigured(),
  })),

  catalog: adminProcedure.query(() => listCatalog()),

  customer: adminProcedure
    .input(z.object({ email: z.email() }))
    .query(async ({ input }) => {
      const customer = await findCustomer(input.email);
      return customer && { name: customer.name ?? null, email: customer.email ?? null };
    }),

  payments: adminProcedure.input(slugInput).query(({ input }) => listLinks(input.slug)),

  createPayment: adminProcedure
    .input(slugInput.extend({ link: createLinkSchema }))
    .mutation(async ({ input }) => {
      if ((await listKeys(`${input.slug}/`)).length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Website not found." });
      }
      return createLink(input.slug, input.link);
    }),

  expirePayment: adminProcedure
    .input(slugInput.extend({ id: z.string().startsWith("cs_") }))
    .mutation(async ({ input }) => {
      await expireLink(input.slug, input.id);
      return { expired: true };
    }),

  // Turn a design into a real hub project (preview-only upload project), owned
  // by Ali or by the client whose Hub account has `clientEmail`.
  import: adminProcedure
    .input(
      slugInput.extend({
        name: z.string().trim().min(1).max(100),
        clientEmail: z.email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let owner = { id: ctx.session.user.id, email: ctx.session.user.email };
      if (input.clientEmail) {
        const [client] = await db
          .select({ id: userTable.id, email: userTable.email })
          .from(userTable)
          .where(sql`lower(${userTable.email}) = lower(${input.clientEmail})`)
          .limit(1);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No Hub account with that email. Have them sign up first.",
          });
        }
        owner = client;
      }
      const files = await readSiteFiles(input.slug);
      const project = await createUploadProjectFromFiles({
        userId: owner.id,
        name: input.name,
        files,
      });
      return { ...project, mine: owner.id === ctx.session.user.id, ownerEmail: owner.email };
    }),
});

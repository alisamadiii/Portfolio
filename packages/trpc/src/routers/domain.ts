import { revalidateTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import z from "zod";

import { cmsProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubDomain } from "@workspace/drizzle/schema";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { resolveRepoId } from "@workspace/trpc/lib/cms/repo-id";
import { deriveWebsiteUrl } from "@workspace/trpc/lib/domain";

// Domain management is open to every collaborator of the repo (cmsProcedure, no
// admin assert) — clients manage their own domains. The hub DB is the source of
// truth: domains are plain metadata the client points at their own host. No
// provider, no verification, no DNS-record generation.

// The home page website-status card caches per-URL ping results under this tag;
// bust it whenever the domain set (and thus the derived URL) changes.
const revalidateWebsiteStatus = () =>
  revalidateTag("website-status", { expire: 0 });

// A bare hostname, e.g. "acme.com" / "www.acme.com". No scheme, no path.
const hostname = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    "Enter a valid domain, e.g. example.com (no https:// or path)."
  );

const listByRepo = (repoId: number) =>
  db
    .select()
    .from(hubDomain)
    .where(eq(hubDomain.repoId, repoId))
    .orderBy(asc(hubDomain.id));

/** Primary first, then by insertion order — the shape the panel renders. */
const sortForDisplay = <T extends { isPrimary: boolean; id: number }>(
  rows: T[]
) => [...rows].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id);

export const domainRouter = createTRPCRouter({
  /** Every domain of the repo (primary first) + the derived website URL. */
  list: cmsProcedure.query(async ({ input }) => {
    try {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const domains = await listByRepo(repoId);
      return { domains: sortForDisplay(domains), websiteUrl: deriveWebsiteUrl(domains) };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /** Add a domain. The first domain added to a repo becomes primary. */
  add: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        const existing = await listByRepo(repoId);
        if (existing.some((d) => d.domain === input.domain)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That domain is already on this project.",
          });
        }

        await db.insert(hubDomain).values({
          repoId,
          domain: input.domain,
          isPrimary: existing.length === 0,
        });

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Rename a domain in place. */
  update: cmsProcedure
    .input(z.object({ domain: hostname, newDomain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        if (input.newDomain !== input.domain) {
          const existing = await listByRepo(repoId);
          if (existing.some((d) => d.domain === input.newDomain)) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "That domain is already on this project.",
            });
          }
        }

        const updated = await db
          .update(hubDomain)
          .set({ domain: input.newDomain, updatedAt: new Date() })
          .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)))
          .returning({ id: hubDomain.id });
        if (updated.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
        }

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Make a domain the primary (canonical) one for the repo. */
  setPrimary: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        await db.transaction(async (tx) => {
          const rows = await tx
            .select({ id: hubDomain.id })
            .from(hubDomain)
            .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)));
          if (rows.length === 0) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
          }
          await tx
            .update(hubDomain)
            .set({ isPrimary: false })
            .where(eq(hubDomain.repoId, repoId));
          await tx
            .update(hubDomain)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)));
        });

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Remove a domain. If it was primary, the earliest remaining one is promoted. */
  remove: cmsProcedure
    .input(z.object({ domain: hostname }))
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
        await db.transaction(async (tx) => {
          const [removed] = await tx
            .delete(hubDomain)
            .where(and(eq(hubDomain.repoId, repoId), eq(hubDomain.domain, input.domain)))
            .returning({ isPrimary: hubDomain.isPrimary });
          if (removed?.isPrimary) {
            const [next] = await tx
              .select({ id: hubDomain.id })
              .from(hubDomain)
              .where(eq(hubDomain.repoId, repoId))
              .orderBy(asc(hubDomain.id))
              .limit(1);
            if (next) {
              await tx
                .update(hubDomain)
                .set({ isPrimary: true, updatedAt: new Date() })
                .where(eq(hubDomain.id, next.id));
            }
          }
        });

        revalidateWebsiteStatus();
        return { domains: sortForDisplay(await listByRepo(repoId)) };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});

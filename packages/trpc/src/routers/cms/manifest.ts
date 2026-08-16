import { TRPCError } from "@trpc/server";
import z from "zod";

import { cmsProcedure, createTRPCRouter } from "../../init";
import { getConfig } from "../../lib/cms/config-store";
import { toTRPCError } from "../../lib/cms/errors";
import { getManifest } from "../../lib/cms/manifest-store";

/**
 * CMS v2 manifest access. `detect` tells the hub which engine a repo runs on:
 * a repo with `src/data/cms.json` is v2 (schema-less, canvas-only); a repo
 * with `.pages.yml` is legacy. Manifest presence wins — a migrated repo may
 * briefly keep a stale `.pages.yml` around.
 */
export const manifestRouter = createTRPCRouter({
  get: cmsProcedure
    .input(z.object({ branch: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manifest = await getManifest(
          input.owner,
          input.repo,
          input.branch,
          { getToken: async () => ctx.token }
        );
        return manifest;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  detect: cmsProcedure
    .input(z.object({ branch: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manifest = await getManifest(
          input.owner,
          input.repo,
          input.branch,
          { getToken: async () => ctx.token }
        );
        if (manifest) return { engine: "v2" as const };

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => ctx.token,
        });
        if (config) return { engine: "legacy" as const };

        return { engine: "none" as const };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});

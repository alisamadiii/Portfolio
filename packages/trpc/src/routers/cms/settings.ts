import { TRPCError } from "@trpc/server";
import { and, sql } from "drizzle-orm";
import z from "zod";

import {
  cmsProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import {
  getMediaProvider,
  isMediaProviderId,
  toPublicMediaConfig,
} from "@workspace/cms-core/media-providers";
import { assertAdminUser } from "@workspace/trpc/lib/cms/authz-shared";
import { getConfig } from "@workspace/trpc/lib/cms/config-store";
import { configTable, db } from "@workspace/trpc/lib/cms/db";
import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { clearFileCache } from "@workspace/trpc/lib/cms/github-cache-file";
import { deleteCacheFileMeta } from "@workspace/trpc/lib/cms/github-cache-meta";
import {
  getBasePath as getRepoBasePath,
  getMediaSettings as getRepoMediaSettings,
  getPublicMediaSettings,
  setBasePath as setRepoBasePath,
  setMediaSettings as setRepoMediaSettings,
} from "@workspace/trpc/lib/cms/repo-settings";

/**
 * Get the per-repository base path (monorepo subfolder support).
 * Port of GET /api/[owner]/[repo]/base-path. Never reads the config, so it
 * works even when `.pages.yml` doesn't exist yet.
 */
const getBasePath = cmsProcedure
  .query(async ({ input, ctx }) => {
    try {
      assertAdminUser(ctx.user, "Only admins can manage the base path.");

      const basePath = await getRepoBasePath(input.owner, input.repo);

      return { basePath };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

/** Set the base path + clear all cached data. Port of PUT .../base-path. */
const setBasePath = cmsProcedure
  .input(z.object({ basePath: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      assertAdminUser(ctx.user, "Only admins can manage the base path.");

      const basePath = await setRepoBasePath(
        input.owner,
        input.repo,
        input.basePath
      );

      // The base path changes both where `.pages.yml` loads from and how every
      // collection/media path is rebased, so all cached data for ALL branches of
      // this repo is now stale. Clear it so the next load re-resolves from GitHub.
      await db
        .delete(configTable)
        .where(
          and(
            sql`lower(${configTable.owner}) = lower(${input.owner})`,
            sql`lower(${configTable.repo}) = lower(${input.repo})`
          )
        );
      await clearFileCache(input.owner, input.repo);
      await deleteCacheFileMeta(input.owner, input.repo);

      return { message: "Base path updated.", basePath };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

/**
 * Get the per-repository media provider settings. Port of GET
 * /api/[owner]/[repo]/media-settings. Secrets are write-only: never returned
 * — only whether they are set.
 */
const getMediaSettings = cmsProcedure
  .query(async ({ input, ctx }) => {
    try {
      assertAdminUser(ctx.user, "Only admins can manage media settings.");

      const { provider, config } = await getPublicMediaSettings(
        input.owner,
        input.repo
      );

      // Tell the UI which secrets are already stored (without their values).
      const { config: fullConfig } = await getRepoMediaSettings(
        input.owner,
        input.repo
      );
      const secretsSet = getMediaProvider(provider)
        .configFields.filter((field) => !field.public && fullConfig[field.key])
        .map((field) => field.key);

      return { provider, config, secretsSet };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

/**
 * Set the media provider settings. Port of PUT .../media-settings. An empty
 * value for a secret field keeps the stored one (write-only inputs).
 */
const setMediaSettings = cmsProcedure
  .input(
    z.object({
      provider: z.string(),
      config: z.record(z.string(), z.string()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      assertAdminUser(ctx.user, "Only admins can manage media settings.");

      if (!isMediaProviderId(input.provider)) {
        throw createHttpError('"provider" is invalid.', 400);
      }

      const saved = await setRepoMediaSettings(
        input.owner,
        input.repo,
        input.provider,
        input.config ?? {}
      );

      return {
        message: "Media settings updated.",
        provider: saved.provider,
        config: toPublicMediaConfig(saved.provider, saved.config),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

/**
 * Synced `.pages.yml` config for a branch (port of what the
 * [owner]/[repo]/[branch] layout resolved server-side: getToken + getConfig).
 * Returns Config | null — null when `.pages.yml` doesn't exist yet.
 */
const getBranchConfig = cmsProcedure
  .input(z.object({ branch: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      return getConfig(input.owner, input.repo, input.branch, {
        getToken: async () => ctx.token,
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const settingsRouter = createTRPCRouter({
  getBasePath,
  setBasePath,
  getMediaSettings,
  setMediaSettings,
  getConfig: getBranchConfig,
});

export { settingsRouter };

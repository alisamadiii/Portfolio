import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import z from "zod";

import { readAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/index";
import { account, hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import {
  createNeonProject,
  forgetNeonToken,
  getNeonConnectionUri,
  getNeonProject,
  listNeonBranches,
  listNeonDatabases,
  listNeonEndpoints,
  listNeonOrgs,
  listNeonProjects,
  listNeonRoles,
  neonTokenFor,
  revokeNeonGrant,
} from "../lib/neon";
import { NEON_REGIONS } from "../lib/neon-regions";

// The project's Neon app: the client links Neon (OAuth), binds one of their
// Neon projects (or creates one) to this hub project, then sees its branches,
// databases and compute state and copies connection strings. The hub never
// deletes anything in Neon. One Neon project per hub project.

const regionIds = NEON_REGIONS.map((r) => r.id) as [string, ...string[]];

const projectRow = async (projectId: string) => {
  const [row] = await db
    .select({
      neonConnectedUserId: hubProject.neonConnectedUserId,
      neonAccountId: hubProject.neonAccountId,
      neonProjectId: hubProject.neonProjectId,
      neonOrgId: hubProject.neonOrgId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
};

const projectToken = async (projectId: string) => {
  const row = await projectRow(projectId);
  if (!row.neonConnectedUserId || !row.neonAccountId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect Neon first." });
  }
  return { row, token: await neonTokenFor(row.neonConnectedUserId, row.neonAccountId) };
};

const boundProject = async (projectId: string) => {
  const { row, token } = await projectToken(projectId);
  if (!row.neonProjectId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Choose a Neon project first." });
  }
  return { token, neonProjectId: row.neonProjectId };
};

/** Refuses a Neon project another hub project already uses. */
const assertFree = async (projectId: string, neonProjectId: string) => {
  const [taken] = await db
    .select({ repo: hubProject.repo })
    .from(hubProject)
    .where(and(eq(hubProject.neonProjectId, neonProjectId), ne(hubProject.id, projectId)))
    .limit(1);
  if (taken) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `That Neon project is already linked to ${taken.repo}.`,
    });
  }
};

const bind = (projectId: string, neonProjectId: string | null, orgId: string | null) =>
  db
    .update(hubProject)
    .set({ neonProjectId, neonOrgId: orgId })
    .where(eq(hubProject.id, projectId));

const orgInput = z.object({ orgId: z.string().min(1).max(100).optional() });

export const neonRouter = createTRPCRouter({
  status: cmsProcedure.query(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    return {
      connected: !!(row.neonConnectedUserId && row.neonAccountId),
      neonProjectId: row.neonProjectId,
    };
  }),

  // Runs right after Neon's consent screen: binds the account the caller
  // just linked (their most recently written Neon account row).
  connect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const [linked] = await db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, ctx.user.id), eq(account.providerId, "neon")))
      .orderBy(desc(account.updatedAt))
      .limit(1);
    if (!linked) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Neon wasn't connected. Try again.",
      });
    }
    await db
      .update(hubProject)
      .set({ neonConnectedUserId: ctx.user.id, neonAccountId: linked.accountId })
      .where(eq(hubProject.id, ctx.projectId));
    return { ok: true };
  }),

  // Unbinds and, when no other project uses the same Neon account, ends the
  // grant. Nothing in Neon is deleted.
  disconnect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    if (row.neonConnectedUserId && row.neonAccountId) {
      const [shared] = await db
        .select({ id: hubProject.id })
        .from(hubProject)
        .where(
          and(
            eq(hubProject.neonConnectedUserId, row.neonConnectedUserId),
            eq(hubProject.neonAccountId, row.neonAccountId),
            ne(hubProject.id, ctx.projectId)
          )
        )
        .limit(1);
      if (!shared) {
        const where = and(
          eq(account.userId, row.neonConnectedUserId),
          eq(account.providerId, "neon"),
          eq(account.accountId, row.neonAccountId)
        );
        const [linked] = await db
          .select({ refreshToken: account.refreshToken })
          .from(account)
          .where(where)
          .limit(1);
        const refreshToken = await readAccountToken(linked?.refreshToken);
        if (refreshToken) await revokeNeonGrant(refreshToken);
        await db.delete(account).where(where);
        forgetNeonToken(row.neonConnectedUserId, row.neonAccountId);
      }
    }
    await db
      .update(hubProject)
      .set({
        neonConnectedUserId: null,
        neonAccountId: null,
        neonProjectId: null,
        neonOrgId: null,
      })
      .where(eq(hubProject.id, ctx.projectId));
    return { ok: true };
  }),

  orgs: cmsFullAccessProcedure.query(async ({ ctx }) => {
    const { token } = await projectToken(ctx.projectId);
    const orgs = await listNeonOrgs(token);
    return orgs.map((o) => ({ id: o.id, name: o.name }));
  }),

  projects: cmsFullAccessProcedure.input(orgInput).query(async ({ ctx, input }) => {
    const { token } = await projectToken(ctx.projectId);
    const projects = await listNeonProjects(token, input.orgId);
    const bound = await db
      .select({ neonProjectId: hubProject.neonProjectId, repo: hubProject.repo })
      .from(hubProject)
      .where(and(isNotNull(hubProject.neonProjectId), ne(hubProject.id, ctx.projectId)));
    const usedBy = new Map(bound.map((b) => [b.neonProjectId, b.repo]));
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      regionId: p.region_id,
      pgVersion: p.pg_version,
      createdAt: p.created_at,
      linkedTo: usedBy.get(p.id) ?? null,
    }));
  }),

  bindProject: cmsFullAccessProcedure
    .input(orgInput.extend({ neonProjectId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const { token } = await projectToken(ctx.projectId);
      await getNeonProject(token, input.neonProjectId);
      await assertFree(ctx.projectId, input.neonProjectId);
      await bind(ctx.projectId, input.neonProjectId, input.orgId ?? null);
      return { ok: true };
    }),

  createProject: cmsFullAccessProcedure
    .input(
      orgInput.extend({
        name: z.string().trim().min(1).max(64),
        regionId: z.enum(regionIds),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token } = await projectToken(ctx.projectId);
      const project = await createNeonProject(token, input);
      await bind(ctx.projectId, project.id, input.orgId ?? null);
      return { id: project.id };
    }),

  unbindProject: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    await bind(ctx.projectId, null, null);
    return { ok: true };
  }),

  overview: cmsProcedure.query(async ({ ctx }) => {
    const { token, neonProjectId } = await boundProject(ctx.projectId);
    const [project, branches, endpoints] = await Promise.all([
      getNeonProject(token, neonProjectId),
      listNeonBranches(token, neonProjectId),
      listNeonEndpoints(token, neonProjectId),
    ]);
    return {
      id: project.id,
      name: project.name,
      regionId: project.region_id,
      pgVersion: project.pg_version,
      createdAt: project.created_at,
      storageBytes: project.synthetic_storage_size ?? null,
      branches: branches
        .map((b) => ({
          id: b.id,
          name: b.name,
          isDefault: !!(b.default ?? b.primary),
          state: b.current_state,
          sizeBytes: b.logical_size ?? null,
          createdAt: b.created_at,
          compute:
            endpoints.find((e) => e.branch_id === b.id && e.type === "read_write")
              ?.current_state ?? null,
        }))
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    };
  }),

  databases: cmsProcedure
    .input(z.object({ branchId: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const { token, neonProjectId } = await boundProject(ctx.projectId);
      const [databases, roles] = await Promise.all([
        listNeonDatabases(token, neonProjectId, input.branchId),
        listNeonRoles(token, neonProjectId, input.branchId),
      ]);
      return {
        databases: databases.map((d) => ({ id: d.id, name: d.name, owner: d.owner_name })),
        roles: roles.filter((r) => !r.protected).map((r) => r.name),
      };
    }),

  // Returns a password-bearing secret: full access only, never stored.
  connectionString: cmsFullAccessProcedure
    .input(
      z.object({
        branchId: z.string().min(1).max(100),
        databaseName: z.string().min(1).max(100),
        roleName: z.string().min(1).max(100),
        pooled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token, neonProjectId } = await boundProject(ctx.projectId);
      return { uri: await getNeonConnectionUri(token, neonProjectId, input) };
    }),
});

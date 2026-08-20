import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Client Hub (hub.alisamadii.com) — GitHub-backed content management

// Framer-style collaborator roles: view-only < content-editor < full-access.
export const COLLABORATOR_ROLE_VALUES = [
  "full-access",
  "content-editor",
  "view-only",
] as const;

export type CollaboratorRole = (typeof COLLABORATOR_ROLE_VALUES)[number];

export const hubCollaborator = pgTable(
  "hub_collaborator",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    // LEGACY: GitHub owner id from the old GitHub-backed invite flow. No code
    // reads or writes it anymore — collaborators are scoped by repoId.
    ownerId: integer("owner_id"),
    repoId: integer("repo_id"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch"),
    email: text("email").notNull(),
    userId: text("user_id").references(() => user.id),
    invitedBy: text("invited_by").references(() => user.id),
    // Plain text (not pgEnum): drizzle-kit push mishandles adding enum-typed
    // columns to existing tables (see mediaProvider on hubProject).
    role: text("role").$type<CollaboratorRole>().notNull().default("full-access"),
  },
  (table) => ({
    idxHubCollaboratorOwnerRepoEmail: index(
      "idx_hub_collaborator_owner_repo_email"
    ).on(table.owner, table.repo, table.email),
    idxHubCollaboratorUserId: index("idx_hub_collaborator_user_id").on(
      table.userId
    ),
    uqHubCollaboratorOwnerRepoEmailCi: uniqueIndex(
      "uq_hub_collaborator_owner_repo_email_ci"
    ).on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`,
      sql`lower(${table.email})`
    ),
  })
);

export const hubCollaboratorInvite = pgTable(
  "hub_collaborator_invite",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    email: text("email").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqHubCollaboratorInviteToken: uniqueIndex(
      "uq_hub_collaborator_invite_token"
    ).on(table.token),
    idxHubCollaboratorInviteOwnerRepoEmail: index(
      "idx_hub_collaborator_invite_owner_repo_email"
    ).on(table.owner, table.repo, table.email),
    uqHubCollaboratorInviteOwnerRepoEmailCi: uniqueIndex(
      "uq_hub_collaborator_invite_owner_repo_email_ci"
    ).on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`,
      sql`lower(${table.email})`
    ),
  })
);

export const hubConfig = pgTable(
  "hub_config",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull(),
    sha: text("sha").notNull(),
    version: text("version").notNull(),
    object: text("object").notNull(),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
  },
  (table) => ({
    idxHubConfigOwnerRepoBranch: uniqueIndex(
      "idx_hub_config_owner_repo_branch"
    ).on(table.owner, table.repo, table.branch),
  })
);

// Where hub media is stored/browsed for a project. Add new providers here.
// (Values only — the column on hubProject is plain text, not a pgEnum, because
// drizzle-kit push mishandles adding enum-typed columns to existing tables.)
export const mediaProviderValues = ["imagekit"] as const;

export type MediaProviderId = (typeof mediaProviderValues)[number];

export const hubProject = pgTable(
  "hub_project",
  {
    id: serial("id").primaryKey(),
    repoId: integer("repo_id").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    private: boolean("private").notNull().default(false),
    defaultBranch: text("default_branch").notNull(),
    githubUpdatedAt: timestamp("github_updated_at").notNull(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
    // Per-project settings. syncOrgRepos' onConflictDoUpdate.set does NOT list
    // these, so they survive every webhook re-sync; new projects fall back to
    // these defaults.
    basePath: text("base_path").notNull().default(""),
    // Plain text (not a pgEnum): the value is always "imagekit" and never read
    // for logic, and drizzle-kit push mishandles adding an enum-typed column
    // to an existing table.
    mediaProvider: text("media_provider").notNull().default("imagekit"),
    // DEPRECATED: replaced by the derived URL from hub_domain (Vercel-synced).
    // No code reads this anymore — kept only to compare against the derived
    // URLs after the first domain backfill (vercel.domains.syncAll). Drop the
    // column + push once parity is confirmed.
    websiteUrl: text("website_url"),
    // Agency-granted free-for-life access. When true, the hub gate is bypassed
    // for this project for every user (no subscription, no Stripe), and Billing
    // shows a gratitude panel. Set directly in the DB (no admin UI). Like the
    // other per-project settings, it is intentionally absent from syncOrgRepos'
    // onConflict set() so it survives every GitHub webhook re-sync.
    freeLife: boolean("free_life").notNull().default(false),
    // Cached Vercel project id, auto-discovered by matching the project's
    // GitHub link (GET /v9/projects → link.repoId === repoId). Also absent from
    // syncOrgRepos' onConflict set() so it survives GitHub webhook re-syncs.
    vercelProjectId: text("vercel_project_id"),
    // Blog sync state: the Blog tab shows an "unpublished changes" banner when
    // blogEditedAt > blogPublishedAt. Edited is stamped on every blog CRUD
    // mutation (including deletes, which max(updatedAt) could never detect);
    // published is stamped when the Publish button fires the blog-sync
    // repository_dispatch. Also absent from syncOrgRepos' onConflict set().
    blogEditedAt: timestamp("blog_edited_at"),
    blogPublishedAt: timestamp("blog_published_at"),
  },
  (table) => ({
    uqHubProjectRepoId: uniqueIndex("uq_hub_project_repo_id").on(table.repoId),
    uqHubProjectOwnerRepoCi: uniqueIndex("uq_hub_project_owner_repo_ci").on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`
    ),
  })
);

// Vercel project domains, one row per (repo, domain) — including *.vercel.app.
// Source of truth is the Vercel API; rows are replaced wholesale by
// syncDomainsForRepo (state-sync, same pattern as the Stripe webhook). The
// live site URL shown across the hub is derived from these rows.
export const hubDomain = pgTable(
  "hub_domain",
  {
    id: serial("id").primaryKey(),
    // = hubProject.repoId (GitHub-stable)
    repoId: integer("repo_id").notNull(),
    // Lowercased host, e.g. "acme.com" / "www.acme.com" / "acme.vercel.app"
    domain: text("domain").notNull(),
    apexName: text("apex_name").notNull(),
    verified: boolean("verified").notNull().default(false),
    // From GET /v6/domains/{domain}/config — null until first config check.
    misconfigured: boolean("misconfigured"),
    redirect: text("redirect"),
    redirectStatusCode: integer("redirect_status_code"),
    // Null = production domain
    gitBranch: text("git_branch"),
    // Vercel `verification` array (TXT challenges) for the DNS instructions UI.
    verification: jsonb("verification").$type<
      { type: string; domain: string; value: string; reason: string }[]
    >(),
    // Raw /config response (recommendedCNAME/recommendedIPv4/…) — powers the
    // A/CNAME instruction block without schema churn.
    dnsConfig: jsonb("dns_config").$type<Record<string, unknown>>(),
    vercelCreatedAt: timestamp("vercel_created_at"),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (table) => ({
    uqHubDomainRepoDomainCi: uniqueIndex("uq_hub_domain_repo_domain_ci").on(
      table.repoId,
      sql`lower(${table.domain})`
    ),
    idxHubDomainRepoId: index("idx_hub_domain_repo_id").on(table.repoId),
  })
);

// Blog posts authored in the hub and mirrored into the client repo's
// src/content/blog/ by the repo's blog-sync GitHub Action (repository_dispatch
// fired from cms.blog.publish). The DB is the editing store; git stays the
// deployed source of truth.
export const BLOG_POST_STATUS_VALUES = ["draft", "published"] as const;

export type BlogPostStatus = (typeof BLOG_POST_STATUS_VALUES)[number];

export const hubBlogPost = pgTable(
  "hub_blog_post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // = hubProject.repoId (GitHub-stable)
    repoId: integer("repo_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    // v1: plain URL string
    coverImage: text("cover_image"),
    coverImageAlt: text("cover_image_alt"),
    // Markdown
    body: text("body").notNull().default(""),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    // Plain text (not pgEnum): drizzle-kit push mishandles enum columns.
    status: text("status").$type<BlogPostStatus>().notNull().default("draft"),
    // First time the post flipped to published — the stable frontmatter
    // publishDate (later edits move updatedAt, not this).
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqHubBlogPostRepoSlugCi: uniqueIndex("uq_hub_blog_post_repo_slug_ci").on(
      table.repoId,
      sql`lower(${table.slug})`
    ),
    idxHubBlogPostRepoId: index("idx_hub_blog_post_repo_id").on(table.repoId),
  })
);

export const hubCacheFile = pgTable(
  "hub_cache_file",
  {
    id: serial("id").primaryKey(),
    context: text("context").notNull().default("collection"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull(),
    parentPath: text("parent_path").notNull(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    type: text("type").notNull(),
    content: text("content"),
    sha: text("sha"),
    size: integer("size"),
    downloadUrl: text("download_url"),
    commitSha: text("commit_sha"),
    commitTimestamp: timestamp("commit_timestamp"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    idxHubCacheFileOwnerRepoBranchParentPath: index(
      "idx_hub_cache_file_owner_repo_branch_parent_path"
    ).on(table.owner, table.repo, table.branch, table.parentPath),
    idxHubCacheFileOwnerRepoBranchPath: uniqueIndex(
      "idx_hub_cache_file_owner_repo_branch_path"
    ).on(table.owner, table.repo, table.branch, table.path),
  })
);

export const hubCacheFileMeta = pgTable(
  "hub_cache_file_meta",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull(),
    path: text("path").notNull().default(""),
    context: text("context").notNull().default("branch"),
    commitSha: text("commit_sha"),
    commitTimestamp: timestamp("commit_timestamp"),
    status: text("status").notNull().default("ok"),
    error: text("error"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
  },
  (table) => ({
    idxHubCacheFileMetaOwnerRepoBranchPathContext: uniqueIndex(
      "idx_hub_cache_file_meta_owner_repo_branch_path_context"
    ).on(table.owner, table.repo, table.branch, table.path, table.context),
  })
);

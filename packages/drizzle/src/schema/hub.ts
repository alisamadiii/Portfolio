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
    // = hubProject.repoId. Cascade handled in application code (deleteProject).
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
    // Per-project settings, with defaults for new projects.
    basePath: text("base_path").notNull().default(""),
    // Plain text (not a pgEnum): the value is always "imagekit" and never read
    // for logic, and drizzle-kit push mishandles adding an enum-typed column
    // to an existing table.
    mediaProvider: text("media_provider").notNull().default("imagekit"),
    // Agency-granted free-for-life access. When true, the hub gate is bypassed
    // for this project for every user (no subscription, no Stripe), and Billing
    // shows a gratitude panel. Set directly in the DB (no admin UI).
    freeLife: boolean("free_life").notNull().default(false),
    // Blog sync state: the Blog tab shows an "unpublished changes" banner when
    // blogEditedAt > blogPublishedAt. Edited is stamped on every blog CRUD
    // mutation (including deletes, which max(updatedAt) could never detect);
    // published is stamped when the Publish button fires the blog-sync
    // repository_dispatch.
    blogEditedAt: timestamp("blog_edited_at"),
    blogPublishedAt: timestamp("blog_published_at"),
    // useSend domainId of this project's sending domain — scopes the hub
    // Emails tab to that domain's sends. Null → tab is admin-only and shows
    // every send on the instance. Set directly in the DB (no admin UI).
    usesendDomainId: text("usesend_domain_id"),
    // Sending domain created in useSend but not yet DNS-verified — the Emails
    // tab's connect flow parks the id here so setup survives refreshes and slow
    // DNS propagation, then moves it into usesendDomainId once verified.
    usesendPendingDomainId: text("usesend_pending_domain_id"),
    // Per-client Google Analytics. gaPropertyId is the numeric GA4 property id
    // (e.g. "123456789") the project's Analytics tab reports on; gaConnectedUserId
    // is the Better Auth user.id whose stored Google token (account table) we use
    // to call the GA4 Data API — project-level, so any viewer sees the data. Both
    // set via the Analytics tab.
    gaPropertyId: text("ga_property_id"),
    gaConnectedUserId: text("ga_connected_user_id"),
    // The project's live website URL, e.g. "https://acme.com". Shown across the
    // hub (thumbnail preview, PageSpeed, suggested sending domain) and used as
    // the canvas/SEO base URL. Set at import (add-project form) or directly in
    // the DB.
    websiteUrl: text("website_url"),
    // Per-client GitHub. The Better Auth user.id whose stored GitHub OAuth token
    // (account table, "repo" scope) backstops reads/commits for this project when
    // there's no caller (the webhook path) — the editing user's own token is used
    // interactively. Set at import. githubWebhookId is the push webhook we
    // register on that repo (for teardown on delete).
    githubConnectedUserId: text("github_connected_user_id"),
    githubWebhookId: integer("github_webhook_id"),
    // Danger-tab tombstone. Set true when the project is deleted from the hub;
    // the row stays (keyed by repoId) so it isn't recreated. Every project
    // listing filters hidden=false.
    hidden: boolean("hidden").notNull().default(false),
  },
  (table) => ({
    uqHubProjectRepoId: uniqueIndex("uq_hub_project_repo_id").on(table.repoId),
    uqHubProjectOwnerRepoCi: uniqueIndex("uq_hub_project_owner_repo_ci").on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`
    ),
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
    // = hubProject.repoId (GitHub-stable).
    repoId: integer("repo_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    // Primary target keyword (exact keyword goes in the title only; the
    // description paraphrases).
    keyword: text("keyword").notNull().default(""),
    // SEO analysis (premium checks): synonyms count as keyphrase matches;
    // related keywords each get their own coverage check.
    synonyms: text("synonyms").array().notNull().default(sql`'{}'::text[]`),
    relatedKeywords: text("related_keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Plain URL string
    heroImage: text("hero_image"),
    heroImageAlt: text("hero_image_alt"),
    // Photo credit, e.g. a Pexels attribution.
    heroCredit: jsonb("hero_credit").$type<{
      name: string;
      url: string;
      pexelsUrl: string;
    }>(),
    // Optional byline; omitted → the client site renders no author block.
    author: jsonb("author").$type<{
      name: string;
      title: string;
      avatar: string;
      url: string;
    }>(),
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

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Client Hub CMS (hub.alisamadii.com) — GitHub-backed content management

export const cmsCollaborator = pgTable(
  "cms_collaborator",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    ownerId: integer("owner_id").notNull(),
    repoId: integer("repo_id"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch"),
    email: text("email").notNull(),
    userId: text("user_id").references(() => user.id),
    invitedBy: text("invited_by").references(() => user.id),
  },
  (table) => ({
    idxCmsCollaboratorOwnerRepoEmail: index(
      "idx_cms_collaborator_owner_repo_email"
    ).on(table.owner, table.repo, table.email),
    idxCmsCollaboratorUserId: index("idx_cms_collaborator_user_id").on(
      table.userId
    ),
    uqCmsCollaboratorOwnerRepoEmailCi: uniqueIndex(
      "uq_cms_collaborator_owner_repo_email_ci"
    ).on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`,
      sql`lower(${table.email})`
    ),
  })
);

export const cmsCollaboratorInvite = pgTable(
  "cms_collaborator_invite",
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
    uqCmsCollaboratorInviteToken: uniqueIndex(
      "uq_cms_collaborator_invite_token"
    ).on(table.token),
    idxCmsCollaboratorInviteOwnerRepoEmail: index(
      "idx_cms_collaborator_invite_owner_repo_email"
    ).on(table.owner, table.repo, table.email),
    uqCmsCollaboratorInviteOwnerRepoEmailCi: uniqueIndex(
      "uq_cms_collaborator_invite_owner_repo_email_ci"
    ).on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`,
      sql`lower(${table.email})`
    ),
  })
);

export const cmsConfig = pgTable(
  "cms_config",
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
    idxCmsConfigOwnerRepoBranch: uniqueIndex(
      "idx_cms_config_owner_repo_branch"
    ).on(table.owner, table.repo, table.branch),
  })
);

// Where CMS media is stored/browsed for a repo. Add new providers here.
export const mediaProviderValues = ["imagekit"] as const;
export const mediaProviderEnum = pgEnum("media_provider", mediaProviderValues);

export type MediaProviderId = (typeof mediaProviderValues)[number];

// DEPRECATED: fields merged into cmsOrgRepo (base_path, media_provider). Kept
// only so the one-off backfill can copy existing rows across; remove this table
// + push once the backfill has run (see plan Phase B).
export const cmsRepoSettings = pgTable(
  "cms_repo_settings",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    basePath: text("base_path").notNull().default(""),
    mediaProvider: mediaProviderEnum("media_provider")
      .notNull()
      .default("imagekit"),
    // Provider-specific config (e.g. ImageKit urlEndpoint/publicKey/privateKey/folder)
    mediaConfig: jsonb("media_config").$type<Record<string, string>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqCmsRepoSettingsOwnerRepoCi: uniqueIndex(
      "uq_cms_repo_settings_owner_repo_ci"
    ).on(sql`lower(${table.owner})`, sql`lower(${table.repo})`),
  })
);

export const cmsOrgRepo = pgTable(
  "cms_org_repo",
  {
    id: serial("id").primaryKey(),
    repoId: integer("repo_id").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    private: boolean("private").notNull().default(false),
    defaultBranch: text("default_branch").notNull(),
    githubUpdatedAt: timestamp("github_updated_at").notNull(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
    // Per-repo settings (merged in from the former cms_repo_settings table).
    // syncOrgRepos' onConflictDoUpdate.set does NOT list these, so they survive
    // every webhook re-sync; new repos fall back to these defaults.
    basePath: text("base_path").notNull().default(""),
    // Plain text (not the media_provider enum): the value is always "imagekit"
    // and never read for logic, and drizzle-kit push mishandles adding an
    // enum-typed column to an existing table.
    mediaProvider: text("media_provider").notNull().default("imagekit"),
    // Live client website URL, set by an admin; powers the home page website
    // status card + project gallery preview.
    websiteUrl: text("website_url"),
  },
  (table) => ({
    uqCmsOrgRepoRepoId: uniqueIndex("uq_cms_org_repo_repo_id").on(table.repoId),
    uqCmsOrgRepoOwnerRepoCi: uniqueIndex("uq_cms_org_repo_owner_repo_ci").on(
      sql`lower(${table.owner})`,
      sql`lower(${table.repo})`
    ),
  })
);

export const cmsCacheFile = pgTable(
  "cms_cache_file",
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
    idxCmsCacheFileOwnerRepoBranchParentPath: index(
      "idx_cms_cache_file_owner_repo_branch_parent_path"
    ).on(table.owner, table.repo, table.branch, table.parentPath),
    idxCmsCacheFileOwnerRepoBranchPath: uniqueIndex(
      "idx_cms_cache_file_owner_repo_branch_path"
    ).on(table.owner, table.repo, table.branch, table.path),
  })
);

export const cmsCacheFileMeta = pgTable(
  "cms_cache_file_meta",
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
    idxCmsCacheFileMetaOwnerRepoBranchPathContext: uniqueIndex(
      "idx_cms_cache_file_meta_owner_repo_branch_path_context"
    ).on(table.owner, table.repo, table.branch, table.path, table.context),
  })
);

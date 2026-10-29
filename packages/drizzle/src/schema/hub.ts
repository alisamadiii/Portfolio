import { sql } from "drizzle-orm";
import {
  bigint,
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
    // reads or writes it anymore — collaborators are scoped by projectId.
    ownerId: integer("owner_id"),
    // = hubProject.id. Cascade handled in application code (deleteProject).
    projectId: uuid("project_id"),
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
    // Identity/access match key: collaborators are scoped by projectId
    // (owner/repo are display-only; one GitHub repo can back several projects).
    idxHubCollaboratorProjectId: index("idx_hub_collaborator_project_id").on(
      table.projectId
    ),
    uqHubCollaboratorProjectEmailCi: uniqueIndex(
      "uq_hub_collaborator_project_email_ci"
    ).on(table.projectId, sql`lower(${table.email})`),
  })
);

export const hubCollaboratorInvite = pgTable(
  "hub_collaborator_invite",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    email: text("email").notNull(),
    // = hubProject.id. Invites are scoped by projectId; owner/repo stay for
    // display. Nullable only so the backfill migration is clean.
    projectId: uuid("project_id"),
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
    idxHubCollaboratorInviteProjectId: index(
      "idx_hub_collaborator_invite_project_id"
    ).on(table.projectId),
    uqHubCollaboratorInviteProjectEmailCi: uniqueIndex(
      "uq_hub_collaborator_invite_project_email_ci"
    ).on(table.projectId, sql`lower(${table.email})`),
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

export const hubProject = pgTable(
  "hub_project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // GitHub's numeric repo id. Only used to get/push changes from/to GitHub;
    // project identity is `id` everywhere else (one repo can back several
    // projects). Null for uploads (legacy upload rows still hold a synthetic
    // id until the follow-up cleanup).
    repoId: bigint("repo_id", { mode: "number" }),
    // Where the project's files live: 'github' = App-installed repo (today's
    // flow), 'upload' = zip/folder imported straight into content-pilot's
    // workspace; GitHub-specific features are gated off for uploads.
    source: text("source").notNull().default("github"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    private: boolean("private").notNull().default(false),
    defaultBranch: text("default_branch").notNull(),
    githubUpdatedAt: timestamp("github_updated_at").notNull(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
    // Per-project settings, with defaults for new projects.
    basePath: text("base_path").notNull().default(""),
    // Blog sync state: the Blog tab shows an "unpublished changes" banner when
    // blogEditedAt > blogPublishedAt. Edited is stamped on every blog CRUD
    // mutation (including deletes, which max(updatedAt) could never detect);
    // published is stamped when the Publish button fires the blog-sync
    // repository_dispatch.
    blogEditedAt: timestamp("blog_edited_at"),
    blogPublishedAt: timestamp("blog_published_at"),
    // ── useSend per-project team (workspace) ──
    // Every project is its own useSend team, keyed by projectId (Team.externalId).
    // Provisioned at import via POST /api/v1/workspaces. usesendTeamId is the
    // useSend Team.id; usesendApiKey is that team's API key, returned once at
    // creation and NOT re-derivable — server-only, never sent to the client.
    // All team-scoped useSend calls (emails list, sending, this team's domains)
    // use usesendApiKey; it being set is what "emails are provisioned" means.
    usesendTeamId: integer("usesend_team_id"),
    usesendApiKey: text("usesend_api_key"),
    // Sending uses one shared, env-configured agency domain (alisamadii.com)
    // that every team may send from — no per-project domain. Emails stay
    // isolated per team because useSend records each send under the caller's
    // team. So there's no per-project sending domain column here.
    usesendDomainId: text("usesend_domain_id"),
    // Sending domain created in useSend but not yet DNS-verified — setup parks
    // the id here so it survives refreshes and slow DNS propagation, then moves
    // into usesendDomainId once verified.
    usesendPendingDomainId: text("usesend_pending_domain_id"),
    // Per-client Google Analytics. gaPropertyId is the numeric GA4 property id
    // (e.g. "123456789") the project's Analytics tab reports on; gaConnectedUserId
    // is the Better Auth user.id whose stored Google token (account table) we use
    // to call the GA4 Data API — project-level, so any viewer sees the data. Both
    // set via the Analytics tab.
    gaPropertyId: text("ga_property_id"),
    gaConnectedUserId: text("ga_connected_user_id"),
    // The client's live website URL, e.g. "https://acme.com" (hosted on their
    // own Netlify etc.; the hub only previews + publishes). Shown across the
    // hub (thumbnail preview, PageSpeed, suggested sending domain), used as the
    // canvas/SEO base URL and auto-allowed for the embed scripts. Set at import
    // or in Settings > Domain.
    websiteUrl: text("website_url"),
    // Hostnames the project's embed scripts (lead form / booking / contact) may
    // run on. One list per project, managed from both the website Domain card and
    // the agency settings card. Bare hostnames, www-insensitive; empty/unset =
    // nothing allowed in prod.
    origins: jsonb("origins").$type<string[]>(),
    // Where this project's embed-form submissions (lead / booking / contact) are
    // emailed. Owner-set in the Emails tab; empty = fall back to the project
    // owner's account email.
    notifyEmail: text("notify_email"),
    // Per-client GitHub. The Better Auth user.id who imported the project — owns
    // it (access filtering + full-access role) and whose stored GitHub OAuth
    // token backstops reads/commits when there's no interactive caller. Set at
    // import.
    githubConnectedUserId: text("github_connected_user_id"),
    // Hidden row: an upload reserved but not yet finalized (legacy: old
    // delete tombstones). Every project listing filters hidden=false.
    hidden: boolean("hidden").notNull().default(false),
  },
  (table) => ({
    // Upload names must stay unique (owner='uploads'); GitHub repos may be
    // imported more than once.
    uqHubProjectOwnerRepoCi: uniqueIndex("uq_hub_project_owner_repo_ci")
      .on(sql`lower(${table.owner})`, sql`lower(${table.repo})`)
      .where(sql`${table.source} = 'upload'`),
  })
);

// One row per GitHub App installation ("Ali Samadi App"). Repo→installation
// coverage is never stored here — it's resolved live against GitHub (and
// cached in memory), so this table only carries linking + lifecycle state.
export const githubInstallation = pgTable(
  "github_installation",
  {
    id: serial("id").primaryKey(),
    // GitHub's installation id — what tokens are minted against.
    installationId: integer("installation_id").notNull(),
    // The GitHub account (user or org) the app is installed on. accountId is
    // the stable key (logins change on rename).
    accountLogin: text("account_login").notNull(),
    accountId: integer("account_id").notNull(),
    // Plain text (not pgEnum): drizzle-kit mishandles adding enum-typed columns
    // to existing tables (see role on hubCollaborator). "User" | "Organization".
    accountType: text("account_type").notNull(),
    // GitHub user who clicked install (webhook sender) — used to validate an
    // org installation claim when the account itself can't match a hub user.
    senderGithubId: integer("sender_github_id"),
    senderLogin: text("sender_login"),
    // Hub user who claimed this installation via the setup callback — plays the
    // same role as hubProject.githubConnectedUserId for projects.
    linkedUserId: text("linked_user_id").references(() => user.id),
    // "all" | "selected" — which repos the installation covers.
    repositorySelection: text("repository_selection").notNull().default("selected"),
    // Lifecycle tombstones (mirror hubProject.hidden — rows are never deleted).
    suspendedAt: timestamp("suspended_at"),
    removedAt: timestamp("removed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqGithubInstallationInstallationId: uniqueIndex(
      "uq_github_installation_installation_id"
    ).on(table.installationId),
    idxGithubInstallationLinkedUserId: index(
      "idx_github_installation_linked_user_id"
    ).on(table.linkedUserId),
    idxGithubInstallationAccountId: index(
      "idx_github_installation_account_id"
    ).on(table.accountId),
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

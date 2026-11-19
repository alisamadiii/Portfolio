import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Client Hub (app.alisamadii.com) — GitHub-backed content management

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
    // = hubProject.id. Cascade handled in application code (deleteProject).
    projectId: uuid("project_id"),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    email: text("email").notNull(),
    userId: text("user_id").references(() => user.id),
    invitedBy: text("invited_by").references(() => user.id),
    // Plain text (not pgEnum): drizzle-kit push mishandles adding enum-typed
    // columns to existing tables (see mediaProvider on hubProject).
    role: text("role").$type<CollaboratorRole>().notNull().default("view-only"),
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
    // ── useSend per-project team (workspace) ──
    // Created only by the Newsletter app's "Set up" (never at import), keyed
    // by projectId (Team.externalId). Only the team id is stored: every call
    // uses the instance admin key + X-Team-Id, scoped to this team.
    usesendTeamId: integer("usesend_team_id"),
    // The Newsletter app's one sending domain (useSend Domain.id) and the
    // project's subscriber list (ContactBook.id). Both live inside the
    // project's own team and are only ever read from here, never from client
    // input. One domain per project: claimed with a conditional update.
    usesendDomainId: integer("usesend_domain_id"),
    usesendContactBookId: text("usesend_contact_book_id"),
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
    // Display name set in project Settings. Wins over the website host and
    // the repo slug everywhere a site is named (projectDisplayName).
    name: text("name"),
    // Hostnames the project's embed scripts (lead form / booking / contact) may
    // run on. One list per project, managed from both the website Domain card and
    // the agency settings card. Bare hostnames, www-insensitive; empty/unset =
    // nothing allowed in prod.
    origins: jsonb("origins").$type<string[]>(),
    // Where this project's embed-form submissions (lead / booking / contact) are
    // emailed. Owner-set in the Emails tab; empty = fall back to the project
    // owner's account email.
    notifyEmail: text("notify_email"),
    // Apps the client added from the hub's Apps page ("leads" | "analytics" |
    // "newsletter"). Drives the project sidebar; each app page gates itself by
    // plan feature, so this is only "what the client chose to show".
    apps: text("apps").array().notNull().default(sql`'{}'::text[]`),
    // Per-client GitHub. The Better Auth user.id who imported the project — owns
    // it (access filtering + full-access role) and whose stored GitHub OAuth
    // token backstops reads/commits when there's no interactive caller. Set at
    // import.
    githubConnectedUserId: text("github_connected_user_id"),
    // Netlify hosting for upload projects. Publish builds the site in
    // content-pilot and zip-deploys it to this Netlify site, created on the
    // first publish. netlifyConnectedUserId is the Better Auth user.id whose
    // Netlify OAuth token (account table) owns the site; null = the agency's
    // personal access token (NETLIFY_AGENCY_TOKEN).
    netlifySiteId: text("netlify_site_id"),
    netlifySiteUrl: text("netlify_site_url"),
    netlifyConnectedUserId: text("netlify_connected_user_id"),
    // Upload projects: GitHub repo id of the private backup repo content-pilot
    // pushes main to (GITHUB_BACKUP_ORG). Resolved from pilot on the first
    // Source Code download; the id survives repo renames.
    backupRepoId: bigint("backup_repo_id", { mode: "number" }),
    // The project's own Resend team (one team per project, never shared): the
    // Better Auth user.id who linked it + the Resend team id, which is that
    // user's account.account_id row for provider "resend". Set from the
    // project's Resend page right after the OAuth consent.
    resendConnectedUserId: text("resend_connected_user_id"),
    resendAccountId: text("resend_account_id"),
    // The project's Google Calendar app: the Better Auth user.id who connected
    // it + which of their Google accounts (account.account_id), since a user
    // can link several. The dashboard reads calendars with that token.
    gcalConnectedUserId: text("gcal_connected_user_id"),
    gcalAccountId: text("gcal_account_id"),
    // The project's Neon app: the Better Auth user.id who linked Neon + their
    // Neon user id (account.account_id for provider "neon"), and the Neon
    // project bound to this hub project (+ its org, for org-owned projects).
    neonConnectedUserId: text("neon_connected_user_id"),
    neonAccountId: text("neon_account_id"),
    neonProjectId: text("neon_project_id"),
    neonOrgId: text("neon_org_id"),
    // The project's Wix app: the Wix app instance installed on the client's
    // Wix site (the credential for client-credentials tokens), that site's id,
    // and the Better Auth user.id who installed it from the hub.
    wixInstanceId: text("wix_instance_id"),
    wixSiteId: text("wix_site_id"),
    wixConnectedUserId: text("wix_connected_user_id"),
    // The business logo (Settings › Logo): an R2 key in the public bucket,
    // logos/<projectId>/<content-hash>.webp. One object per project;
    // replacing it deletes the previous key.
    logoKey: text("logo_key"),
    // Business details, the one copy every app reads: edited in project
    // Settings, auto-filled (empties only) by Feedback's place pick and the
    // Google Reviews sync. Maps + write-review URLs derive from the place id.
    phone: text("phone"),
    address: text("address"),
    // Multiline, as typed (one line per day works best).
    hours: text("hours"),
    googlePlaceId: text("google_place_id"),
    // The Business Profile review link, normalized https://g.page/r/<code>/review.
    googleReviewUrl: text("google_review_url"),
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
    // A Resend team belongs to exactly one project.
    uqHubProjectResendAccount: uniqueIndex("uq_hub_project_resend_account")
      .on(table.resendAccountId)
      .where(sql`${table.resendAccountId} is not null`),
    // A Neon project belongs to exactly one hub project.
    uqHubProjectNeonProject: uniqueIndex("uq_hub_project_neon_project")
      .on(table.neonProjectId)
      .where(sql`${table.neonProjectId} is not null`),
    // A Wix site (app instance) belongs to exactly one hub project.
    uqHubProjectWixInstance: uniqueIndex("uq_hub_project_wix_instance")
      .on(table.wixInstanceId)
      .where(sql`${table.wixInstanceId} is not null`),
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

// ─── Feedback app ───────────────────────────────────────────────
// One public review link per project (www.alisamadii.com/review/<id>). The
// Google place is what 5-star customers are sent to review.
export const hubReviewLink = pgTable("hub_review_link", {
  // Short random slug, the public URL id. Kept when the place changes so
  // links already handed out keep working.
  id: text("id").primaryKey(),
  projectId: uuid("project_id").notNull().unique(),
  // Legacy: the place, name, address and review link now live on
  // hub_project (googlePlaceId, name, address, googleReviewUrl) since
  // migration 0070. Nothing reads or writes these; dropped in a follow-up
  // migration once prod is backfilled.
  placeId: text("place_id"),
  businessName: text("business_name"),
  address: text("address"),
  placeTypes: text("place_types").array(),
  googleReviewUrl: text("google_review_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Every rating left on a review link. 5 stars are stored too (no message) so
// the stats are real; wentToGoogle = the customer opened the Google review.
export const hubReviewFeedback = pgTable(
  "hub_review_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    linkId: text("link_id").notNull(),
    rating: smallint("rating").notNull(),
    message: text("message"),
    name: text("name"),
    contact: text("contact"),
    wentToGoogle: boolean("went_to_google").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idxProjectCreated: index("hub_review_feedback_project_created_idx").on(
      table.projectId,
      table.createdAt
    ),
  })
);

// ─── Reviews app ────────────────────────────────────────────────
// Review sources per project. provider = where reviews come from ("google"
// today via Apify, more later). Google is scraped daily by apps/api
// /api/cron/google-reviews. firstSyncedAt null = the first run (the newest
// 50 reviews) hasn't happened yet; later runs only add new ones.
export const REVIEW_PROVIDERS = ["google"] as const;
export type ReviewProvider = (typeof REVIEW_PROVIDERS)[number];

export const hubReviewsSource = pgTable(
  "hub_reviews_source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    provider: text("provider").$type<ReviewProvider>().notNull(),
    // Normalized listing URL the scraper starts from.
    url: text("url").notNull(),
    // Provider's id for the listing (Google place id), filled by the first scrape.
    externalId: text("external_id"),
    // Legacy: the business name comes from hub_project.name (Settings) since
    // migration 0070. Nothing reads or writes this; dropped with the
    // hub_review_link place columns in a follow-up migration.
    businessName: text("business_name"),
    rating: real("rating"),
    totalReviews: integer("total_reviews"),
    firstSyncedAt: timestamp("first_synced_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqProjectProvider: uniqueIndex("uq_hub_reviews_source_project_provider").on(
      table.projectId,
      table.provider
    ),
  })
);

// Every scraped review, any rating. Never replaced: each sync only inserts
// reviews it hasn't seen (unique project + provider + review id). The public
// website feed picks from these (5 stars with text); hidden = left out of it.
export const hubReview = pgTable(
  "hub_review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    provider: text("provider").$type<ReviewProvider>().notNull(),
    reviewId: text("review_id").notNull(),
    authorName: text("author_name").notNull(),
    authorPhotoUrl: text("author_photo_url"),
    rating: smallint("rating").notNull(),
    // Null for rating-only reviews.
    text: text("text"),
    publishedAt: timestamp("published_at").notNull(),
    ownerReply: text("owner_reply"),
    ownerReplyAt: timestamp("owner_reply_at"),
    reviewUrl: text("review_url"),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uqProjectReview: uniqueIndex("uq_hub_review_project_provider_review").on(
      table.projectId,
      table.provider,
      table.reviewId
    ),
    idxProjectPublished: index("hub_review_project_published_idx").on(
      table.projectId,
      table.publishedAt
    ),
  })
);

// ─── Uber Eats app ──────────────────────────────────────────────
// One Uber Eats store per project. The owner connects it through Uber's
// OAuth (eats.pos_provisioning), the hub activates the integration on the
// store, and from then on the agency app's own client-credentials token reads
// the store, its online status and its orders. Orders arrive by webhook
// (apps/api /api/webhook/uber-eats) and are reconciled hourly by the cron.

export type UberOrderState = "CREATED" | "ACCEPTED" | "DENIED" | "FINISHED" | "CANCELED" | "UNKNOWN";
export type UberOrderType = "PICK_UP" | "DINE_IN" | "DELIVERY_BY_UBER" | "DELIVERY_BY_RESTAURANT" | "UNKNOWN";
export type UberOnlineStatus = "ONLINE" | "PAUSED";
export type UberOrderItem = { title: string; quantity: number };
export type UberPendingStore = {
  storeId: string;
  name: string;
  address: string | null;
};

export const hubUberStore = pgTable(
  "hub_uber_store",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    // Uber's store id (uuid). A store belongs to one project.
    storeId: text("store_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    // IANA, from Uber; KPIs are computed in it.
    timezone: text("timezone"),
    webUrl: text("web_url"),
    // Uber's listing status: active | pending_review | deleted | rejected.
    listingStatus: text("listing_status"),
    // From GET /status: null until read.
    onlineStatus: text("online_status").$type<UberOnlineStatus>(),
    pausedUntil: timestamp("paused_until"),
    offlineReason: text("offline_reason"),
    // Integration flag as Uber reports it (store.provisioned / deprovisioned).
    integrationEnabled: boolean("integration_enabled").notNull().default(true),
    provisionedAt: timestamp("provisioned_at"),
    deprovisionedAt: timestamp("deprovisioned_at"),
    connectedUserId: text("connected_user_id"),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqProject: uniqueIndex("uq_hub_uber_store_project").on(table.projectId),
    uqStore: uniqueIndex("uq_hub_uber_store_store").on(table.storeId),
  })
);

// Every order Uber told us about, upserted by id. Kept lean on purpose: the
// eater's first name, what was ordered and the totals. No phone, no address,
// no raw payload. Never deleted by a sync; disconnect removes them.
export const hubUberOrder = pgTable(
  "hub_uber_order",
  {
    // Uber's order uuid.
    id: text("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    storeId: text("store_id").notNull(),
    // Last 5 characters of the id, what the restaurant sees on the tablet.
    displayId: text("display_id").notNull(),
    state: text("state").$type<UberOrderState>().notNull(),
    type: text("type").$type<UberOrderType>().notNull(),
    placedAt: timestamp("placed_at").notNull(),
    readyAt: timestamp("ready_at"),
    eaterFirstName: text("eater_first_name"),
    items: jsonb("items").$type<UberOrderItem[]>().notNull().default([]),
    itemCount: integer("item_count").notNull().default(0),
    subtotalCents: integer("subtotal_cents"),
    taxCents: integer("tax_cents"),
    totalCents: integer("total_cents"),
    currency: text("currency"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxProjectPlaced: index("hub_uber_order_project_placed_idx").on(table.projectId, table.placedAt),
  })
);

// The merchant's short-lived token between Uber's OAuth callback and the
// owner picking which store to connect (only needed when they have more than
// one). Encrypted at rest, deleted on activate, disconnect or expiry.
export const hubUberProvision = pgTable("hub_uber_provision", {
  projectId: uuid("project_id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenEnc: text("token_enc").notNull(),
  stores: jsonb("stores").$type<UberPendingStore[]>().notNull().default([]),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

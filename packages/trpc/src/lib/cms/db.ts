/**
 * CMS engine database access.
 *
 * Uses the shared WebSocket pool (interactive transactions for the folder
 * cache advisory locks) and re-exports the workspace tables under the names
 * the CMS engine was written against (auth tables are the portfolio-wide
 * ones, CMS tables are prefixed `cms_` in the shared Neon database).
 */
export { db } from "@workspace/drizzle/pool";

export {
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
  hubCollaborator as collaboratorTable,
  hubCollaboratorInvite as collaboratorInviteTable,
  hubConfig as configTable,
  hubProject as orgRepoTable,
  hubCacheFile as cacheFileTable,
  hubCacheFileMeta as cacheFileMetaTable,
} from "@workspace/drizzle/schema";

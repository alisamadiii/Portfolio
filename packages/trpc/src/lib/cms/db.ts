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
  cmsCollaborator as collaboratorTable,
  cmsCollaboratorInvite as collaboratorInviteTable,
  cmsConfig as configTable,
  cmsOrgRepo as orgRepoTable,
  cmsCacheFile as cacheFileTable,
  cmsCacheFileMeta as cacheFileMetaTable,
} from "@workspace/drizzle/schema";

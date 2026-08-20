/**
 * Compatibility layer over the shared workspace schema.
 * Hub code was written against these table names — they map 1:1 onto
 * the shared Neon database (auth tables are the portfolio-wide ones,
 * hub tables are prefixed `hub_` there).
 */
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

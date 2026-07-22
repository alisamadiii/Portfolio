/**
 * Compatibility layer over the shared workspace schema.
 * CMS code was written against these table names — they map 1:1 onto
 * the shared Neon database (auth tables are the portfolio-wide ones,
 * CMS tables are prefixed `cms_` there).
 */
export {
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
  cmsCollaborator as collaboratorTable,
  cmsCollaboratorInvite as collaboratorInviteTable,
  cmsConfig as configTable,
  cmsRepoSettings as repoSettingsTable,
  cmsCacheFile as cacheFileTable,
  cmsCacheFileMeta as cacheFileMetaTable,
} from "@workspace/drizzle/schema";

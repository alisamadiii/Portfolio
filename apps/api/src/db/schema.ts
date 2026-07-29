// The agency-api DB merged into the portfolio Neon project: tables now live in
// the shared schema (@workspace/drizzle). This module re-exports the API's
// slice of it, plus the ApiUser view every route works with.
//
// Identity is Better Auth's `user` table (one row per client);
// API capabilities (bucket, email domain, origins) live in
// `api_client_settings`. Null means the capability is off — routes return a
// readable 403.
export {
  apiClientSettings,
  apiKeys,
  emailLogs,
  envFiles,
  user as users,
  type ApiClientSettings,
  type ApiKey,
  type EmailLog,
  type EnvFile,
  type NewApiClientSettings,
  type NewApiKey,
  type NewEmailLog,
  type NewEnvFile,
} from "@workspace/drizzle/schema";

import type {
  apiClientSettings as apiClientSettingsTable,
  user as userTable,
} from "@workspace/drizzle/schema";

type AuthUser = typeof userTable.$inferSelect;
type Settings = typeof apiClientSettingsTable.$inferSelect;

// What routes see as "the user": Better Auth identity + api_client_settings
// flattened into the shape the old standalone `users` table had. `type` is
// derived from user.role — only "admin" grants /v1/admin/* and origin-check
// exemption.
export type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  type: "user" | "admin";
  bucketName: string | null;
  publicBaseUrl: string | null;
  emailDomain: string | null;
  allowedOrigins: string[];
  createdAt: Date;
};

export function toApiUser(u: AuthUser, s: Settings | null): ApiUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    type: u.role === "admin" ? "admin" : "user",
    bucketName: s?.bucketName ?? null,
    publicBaseUrl: s?.publicBaseUrl ?? null,
    emailDomain: s?.emailDomain ?? null,
    allowedOrigins: s?.allowedOrigins ?? [],
    createdAt: u.createdAt,
  };
}

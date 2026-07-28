import type { AgencyClient } from "../client.js";
import type { Result } from "../error.js";
import type {
  AdminApiKeyWithOwner,
  AdminEmailLogsParams,
  AdminEmailLogsResponse,
  AdminHealthResult,
  AgencyUser,
  CreateApiKeyRequest,
  CreateApiUserRequest,
  CreateApiUserResponse,
  CreatedApiKey,
  CreateEnvFileRequest,
  EnvFileMeta,
  EnvFileMetaWithOwner,
  LookupUserResponse,
  MigrateLegacyResponse,
  SesHealth,
  UpdateApiUserRequest,
  UpdateEnvFileRequest,
} from "../types.js";

// Every method here maps 1:1 to a /v1/admin/* Worker route and requires a key
// whose user has type "admin" (ADMIN_REQUIRED otherwise). Non-admin keys
// should never see this surface.

export class AdminKeysResource {
  constructor(private readonly client: AgencyClient) {}

  /** Every key, newest first, with its owner's email and name. */
  list(): Promise<Result<AdminApiKeyWithOwner[]>> {
    return this.client.request("GET", "/v1/admin/keys");
  }

  /**
   * Mint a key for a user (by id or email). The full key value is returned
   * only here and via reveal.
   */
  create(params: CreateApiKeyRequest): Promise<Result<CreatedApiKey>> {
    return this.client.request("POST", "/v1/admin/keys", { body: params });
  }

  /** Decrypt a key's full value. Revoked keys are never revealed (410). */
  reveal(id: string): Promise<Result<{ key: string }>> {
    return this.client.request("GET", `/v1/admin/keys/${id}/reveal`);
  }

  /** Soft-revoke by default; `permanent` hard-deletes the row. */
  revoke(
    id: string,
    options?: { permanent?: boolean }
  ): Promise<Result<null>> {
    return this.client.request("DELETE", `/v1/admin/keys/${id}`, {
      query: { permanent: options?.permanent ? "1" : undefined },
    });
  }

  /** Mint ak_pub_ keys for users still on legacy ak_live_ ones. Idempotent. */
  migrateLegacy(options?: {
    dryRun?: boolean;
  }): Promise<Result<MigrateLegacyResponse>> {
    return this.client.request("POST", "/v1/admin/keys/migrate-legacy", {
      query: { dryRun: options?.dryRun ? "1" : undefined },
    });
  }
}

export class AdminUsersResource {
  constructor(private readonly client: AgencyClient) {}

  /** API users only — portfolio accounts without API settings are excluded. */
  list(): Promise<Result<AgencyUser[]>> {
    return this.client.request("GET", "/v1/admin/users");
  }

  /** Merged user view plus every active key, decrypted. Exact-match email. */
  lookup(email: string): Promise<Result<LookupUserResponse>> {
    return this.client.request("GET", "/v1/admin/users/lookup", {
      query: { email },
    });
  }

  /**
   * Merged user view. A portfolio user without API settings still returns 200
   * with null capability fields — 404 only for unknown ids.
   */
  get(id: string): Promise<Result<AgencyUser>> {
    return this.client.request("GET", `/v1/admin/users/${id}`);
  }

  /**
   * Create an API user (or attach API access to an existing portfolio
   * account) and auto-mint a key. Bucket and email domain are verified
   * against R2/SES before anything is written.
   */
  create(params: CreateApiUserRequest): Promise<Result<CreateApiUserResponse>> {
    return this.client.request("POST", "/v1/admin/users", { body: params });
  }

  /**
   * Patch identity and/or API settings. The settings patch upserts, so the
   * first save on a user without settings creates them. Same R2/SES
   * verification as create.
   */
  update(
    id: string,
    params: UpdateApiUserRequest
  ): Promise<Result<AgencyUser>> {
    return this.client.request("PATCH", `/v1/admin/users/${id}`, {
      body: params,
    });
  }

  /** Removes API access (settings + keys); the portfolio account stays. */
  delete(id: string): Promise<Result<null>> {
    return this.client.request("DELETE", `/v1/admin/users/${id}`);
  }
}

export class AdminEmailLogsResource {
  constructor(private readonly client: AgencyClient) {}

  /**
   * Per-user email usage: aggregate stats plus the most recent sends. The
   * admin-side counterpart of GET /v1/emails, which only ever shows the
   * calling key's own history.
   */
  list(params: AdminEmailLogsParams): Promise<Result<AdminEmailLogsResponse>> {
    return this.client.request("GET", "/v1/admin/email-logs", {
      query: {
        userId: params.userId,
        limit: params.limit !== undefined ? String(params.limit) : undefined,
      },
    });
  }
}

export class AdminEnvsResource {
  constructor(private readonly client: AgencyClient) {}

  /** Metadata only — content is only served by reveal. */
  list(params?: {
    userId?: string;
    email?: string;
  }): Promise<Result<EnvFileMetaWithOwner[]>> {
    return this.client.request("GET", "/v1/admin/envs", {
      query: { userId: params?.userId, email: params?.email },
    });
  }

  get(id: string): Promise<Result<EnvFileMetaWithOwner>> {
    return this.client.request("GET", `/v1/admin/envs/${id}`);
  }

  /**
   * Decrypt and return the raw .env text. Requires the vault password on top
   * of the admin key (ENV_PASSWORD_INVALID, 403; locked out after 5 misses —
   * TOO_MANY_PASSWORD_ATTEMPTS, 429).
   */
  reveal(id: string, password: string): Promise<Result<string>> {
    return this.client.requestText("POST", `/v1/admin/envs/${id}/reveal`, {
      body: { password },
    });
  }

  create(params: CreateEnvFileRequest): Promise<Result<EnvFileMeta>> {
    return this.client.request("POST", "/v1/admin/envs", { body: params });
  }

  update(
    id: string,
    params: UpdateEnvFileRequest
  ): Promise<Result<EnvFileMeta>> {
    return this.client.request("PATCH", `/v1/admin/envs/${id}`, {
      body: params,
    });
  }

  /** Hard delete. */
  delete(id: string): Promise<Result<null>> {
    return this.client.request("DELETE", `/v1/admin/envs/${id}`);
  }
}

export class AdminResource {
  readonly keys: AdminKeysResource;
  readonly users: AdminUsersResource;
  readonly emailLogs: AdminEmailLogsResource;
  readonly envs: AdminEnvsResource;

  constructor(private readonly client: AgencyClient) {
    this.keys = new AdminKeysResource(client);
    this.users = new AdminUsersResource(client);
    this.emailLogs = new AdminEmailLogsResource(client);
    this.envs = new AdminEnvsResource(client);
  }

  /** SES account/identity/DKIM health and 2-week send statistics. */
  sesHealth(): Promise<Result<SesHealth>> {
    return this.client.request("GET", "/v1/admin/ses");
  }

  /**
   * Live deep probe of Neon/KV/SES/R2. Degraded deployments answer 503, which
   * surfaces here as an error result (HTTP_503) — the cached public /health
   * endpoint is the cheap alternative.
   */
  health(): Promise<Result<AdminHealthResult>> {
    return this.client.request("GET", "/v1/admin/health");
  }
}

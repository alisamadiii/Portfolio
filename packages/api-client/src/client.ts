import { AgencyError, fail, ok, type Result } from "./error.js";
import { AdminResource } from "./resources/admin.js";
import { EmailsResource } from "./resources/emails.js";
import { MeResource } from "./resources/me.js";
import { UploadsResource } from "./resources/uploads.js";

const DEFAULT_BASE_URL = "https://api.alisamadii.com";

export interface AgencyClientOptions {
  /** @default "https://api.alisamadii.com" */
  baseUrl?: string;
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export class AgencyClient {
  readonly emails: EmailsResource;
  readonly uploads: UploadsResource;
  readonly me: MeResource;
  /** /v1/admin/* — requires a key whose user has type "admin". */
  readonly admin: AdminResource;

  readonly #apiKey: string;
  readonly #baseUrl: string;

  constructor(apiKey: string, options?: AgencyClientOptions) {
    if (!apiKey) {
      throw new Error(
        'Missing API key. Pass it as `new AgencyClient("ak_pub_...")`.'
      );
    }
    this.#apiKey = apiKey;
    this.#baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.emails = new EmailsResource(this);
    this.uploads = new UploadsResource(this);
    this.me = new MeResource(this);
    this.admin = new AdminResource(this);
  }

  /** @internal */
  async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<Result<T>> {
    let url = this.#baseUrl + path;
    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== "") params.set(key, value);
      }
      const qs = params.toString();
      if (qs) url += "?" + qs;
    }

    const headers: Record<string, string> = {
      Authorization: "Bearer " + this.#apiKey,
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      return fail(
        new AgencyError(
          0,
          "NETWORK_ERROR",
          err instanceof Error ? err.message : "request failed"
        )
      );
    }

    if (res.status === 204) return ok(null as T);

    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const envelope =
        json && typeof json === "object" && "error" in json
          ? (
              json as {
                error: { code?: string; message?: string; cause?: string };
              }
            ).error
          : null;
      return fail(
        new AgencyError(
          res.status,
          envelope?.code ?? "HTTP_" + res.status,
          envelope?.message ?? "request failed with status " + res.status,
          envelope?.cause
        )
      );
    }

    return ok(json as T);
  }

  /**
   * @internal — for the few endpoints whose 200 body is raw text/plain (env
   * reveal). Errors still arrive in the JSON envelope and are parsed the same
   * way as request().
   */
  async requestText(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<Result<string>> {
    const headers: Record<string, string> = {
      Authorization: "Bearer " + this.#apiKey,
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await fetch(this.#baseUrl + path, {
        method,
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      return fail(
        new AgencyError(
          0,
          "NETWORK_ERROR",
          err instanceof Error ? err.message : "request failed"
        )
      );
    }

    if (!res.ok) {
      const json: unknown = await res.json().catch(() => null);
      const envelope =
        json && typeof json === "object" && "error" in json
          ? (
              json as {
                error: { code?: string; message?: string; cause?: string };
              }
            ).error
          : null;
      return fail(
        new AgencyError(
          res.status,
          envelope?.code ?? "HTTP_" + res.status,
          envelope?.message ?? "request failed with status " + res.status,
          envelope?.cause
        )
      );
    }

    return ok(await res.text());
  }
}

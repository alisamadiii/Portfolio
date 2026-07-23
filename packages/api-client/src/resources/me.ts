import type { AgencyClient } from "../client.js";
import type { Result } from "../error.js";
import type { MeResponse } from "../types.js";

export class MeResource {
  constructor(private readonly client: AgencyClient) {}

  /** Identify the calling key and its user. */
  get(): Promise<Result<MeResponse>> {
    return this.client.request("GET", "/v1/me");
  }
}

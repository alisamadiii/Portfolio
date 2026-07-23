import { AwsClient } from "aws4fetch";

import type { Env } from "../env.js";

import { ApiError } from "./errors.js";

// Signed R2 client + account-level endpoint base (no bucket).
export function r2Client(env: Env): { client: AwsClient; base: string } {
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new ApiError(
      500,
      "STORAGE_NOT_CONFIGURED",
      "R2 credentials not configured on the server.",
      "Set R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (.dev.vars locally)."
    );
  }
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  return { client, base: env.R2_ENDPOINT.replace(/\/+$/, "") };
}

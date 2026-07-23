import { AwsClient } from "aws4fetch";

import type { Env } from "../env.js";

import { ApiError } from "./errors.js";

// Pre-flight checks for user config: the bucket must exist in Cloudflare R2
// and the email domain must be verified in AWS SES, otherwise the user would
// be created with capabilities that can never work.

export async function verifyBucketExists(
  env: Env,
  bucket: string
): Promise<void> {
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
  const base = env.R2_ENDPOINT.replace(/\/+$/, "");
  const res = await client.fetch(`${base}/${bucket}`, { method: "HEAD" });
  if (res.status === 404) {
    throw new ApiError(
      400,
      "BUCKET_NOT_FOUND",
      `Bucket "${bucket}" does not exist in Cloudflare R2.`,
      "Create the bucket in the Cloudflare dashboard (R2 > Create bucket) first, or fix the bucketName spelling."
    );
  }
  if (!res.ok) {
    throw new ApiError(
      502,
      "STORAGE_VERIFY_FAILED",
      `Could not verify bucket "${bucket}" in R2 (${res.status}).`,
      "R2 rejected the check — likely a server-side credentials problem, not the bucket name."
    );
  }
}

// Prove publicBaseUrl actually serves this bucket: write a probe object,
// fetch it through the public URL, compare content, delete the probe.
// Catches wrong domains, disabled public access, and URLs wired to a
// different bucket — none of which a DNS/HEAD check would.
export async function verifyPublicBaseUrl(
  env: Env,
  bucket: string,
  publicBaseUrl: string
): Promise<void> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const base = env.R2_ENDPOINT.replace(/\/+$/, "");
  const key = `verify-probe/${crypto.randomUUID()}.txt`;
  const content = crypto.randomUUID();

  const put = await client.fetch(`${base}/${bucket}/${key}`, {
    method: "PUT",
    headers: { "content-type": "text/plain" },
    body: content,
  });
  if (!put.ok) {
    throw new ApiError(
      502,
      "STORAGE_VERIFY_FAILED",
      `Could not write a probe object to bucket "${bucket}" (${put.status}).`,
      "R2 rejected the write — likely a server-side credentials problem."
    );
  }

  const probeUrl = `${publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  try {
    let res: Response;
    try {
      res = await fetch(probeUrl, { signal: AbortSignal.timeout(8000) });
    } catch {
      throw new ApiError(
        400,
        "PUBLIC_URL_UNREACHABLE",
        `publicBaseUrl is unreachable: could not fetch ${probeUrl}`,
        "The domain does not resolve or does not respond. Check the URL and its DNS."
      );
    }
    if (!res.ok) {
      throw new ApiError(
        400,
        "PUBLIC_URL_NOT_SERVING",
        `publicBaseUrl does not serve bucket "${bucket}" — probe fetch returned ${res.status}.`,
        "Connect the domain to the bucket (R2 > bucket > Settings > Custom Domains) or enable public access, then retry."
      );
    }
    const body = await res.text();
    if (body.trim() !== content) {
      throw new ApiError(
        400,
        "PUBLIC_URL_WRONG_BUCKET",
        `publicBaseUrl serves different content than bucket "${bucket}".`,
        "The URL responds but returns something else — it is probably wired to a different bucket or a site."
      );
    }
  } finally {
    // Best-effort cleanup; a stray probe object is harmless.
    await client
      .fetch(`${base}/${bucket}/${key}`, { method: "DELETE" })
      .catch(() => {});
  }
}

export async function verifyEmailDomain(
  env: Env,
  domain: string
): Promise<void> {
  if (!env.AWS_ACCESS_KEY_VALUE || !env.AWS_SECRET_KEY_VALUE) {
    throw new ApiError(
      500,
      "EMAIL_NOT_CONFIGURED",
      "SES credentials not configured on the server.",
      "Set AWS_ACCESS_KEY_VALUE / AWS_SECRET_KEY_VALUE (.dev.vars locally)."
    );
  }
  const region = env.AWS_BUCKET_ORIGIN || "us-east-1";
  const client = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_VALUE,
    secretAccessKey: env.AWS_SECRET_KEY_VALUE,
    service: "ses",
    region,
  });
  const params = new URLSearchParams({
    Action: "GetIdentityVerificationAttributes",
    "Identities.member.1": domain,
  });
  const res = await client.fetch(`https://email.${region}.amazonaws.com/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const xml = await res.text();
  if (!res.ok) {
    const msg =
      /<Message>([\s\S]*?)<\/Message>/.exec(xml)?.[1] ??
      `SES verification check failed (${res.status})`;
    throw new ApiError(
      502,
      "EMAIL_VERIFY_FAILED",
      msg,
      "SES rejected the check — likely a server-side credentials problem, not the domain."
    );
  }
  // Verified identities come back as an <entry> whose VerificationStatus is
  // "Success"; unknown identities simply have no entry.
  const verified =
    xml.includes(`<key>${domain}</key>`) &&
    /<VerificationStatus>Success<\/VerificationStatus>/.test(xml);
  if (!verified) {
    throw new ApiError(
      400,
      "EMAIL_DOMAIN_NOT_VERIFIED",
      `Domain "${domain}" is not verified in AWS SES (region ${region}).`,
      "Verify the domain in SES (add the DKIM/TXT DNS records and wait for status Success) before assigning it to a user."
    );
  }
}

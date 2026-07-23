export type Env = {
  // Neon Postgres connection string (pooled URL recommended for serverless)
  DATABASE_URL: string;

  // e.g. https://<account_id>.r2.cloudflarestorage.com
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;

  // Secret used to encrypt API-key values at rest (AES-256-GCM). Any string —
  // it's hashed to a 32-byte key. Required to create or reveal keys.
  KEY_ENC_SECRET: string;

  // AWS SES (transactional email). Names reuse the email package's env vars.
  // Region is carried in AWS_BUCKET_ORIGIN (defaults to us-east-1 if unset).
  AWS_ACCESS_KEY_VALUE: string;
  AWS_SECRET_KEY_VALUE: string;
  AWS_BUCKET_ORIGIN?: string; // SES region, e.g. "us-east-1"

  // PostHog project API key (phc_...). Optional — telemetry is a no-op without it.
  POSTHOG_API_KEY?: string;

  // KV namespace backing the contact-form rate limiter (hono-rate-limiter).
  RATE_LIMIT_KV: KVNamespace;
};

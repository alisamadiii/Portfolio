// Shared plumbing for API endpoint tests. The app runs against a fake drizzle
// db: every awaited query chain resolves the next entry from dbQueue, so a
// test scripts the db by pushing result sets in the order the handler will
// await them. Note: an authenticated request pops TWO entries before the
// handler runs — the auth join select and the lastUsedAt update.
import type { ApiKey, ApiUser } from "../db/schema.js";
import type { Env } from "../env.js";
import { hashKey } from "../lib/keys.js";

export const testEnv = {
  DATABASE_URL: "postgres://test",
  R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  KEY_ENC_SECRET: "test-enc-secret",
  AWS_ACCESS_KEY_VALUE: "test-aws-key",
  AWS_SECRET_KEY_VALUE: "test-aws-secret",
  RATE_LIMIT_KV: {} as KVNamespace,
} as Env;

export const testCtx = {
  waitUntil(promise: Promise<unknown>) {
    // Await archived work inside tests via flushWaitUntil().
    pending.push(promise.catch(() => {}));
  },
  passThroughOnException() {},
} as unknown as ExecutionContext;

const pending: Promise<unknown>[] = [];
export async function flushWaitUntil(): Promise<void> {
  await Promise.all(pending.splice(0));
}

// FIFO of result sets; each awaited drizzle chain resolves the next one.
// Push an Error to make that chain reject (e.g. unique-violation tests).
export const dbQueue: unknown[] = [];

export function fakeDb(): unknown {
  const chain: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") {
        const next = dbQueue.length ? dbQueue.shift() : [];
        if (next instanceof Error) {
          return (_res: unknown, reject: (e: unknown) => void) => reject(next);
        }
        return (resolve: (v: unknown) => void) => resolve(next);
      }
      return () => chain;
    },
    apply: () => chain,
  });
  return chain;
}

// workers-types Response.json() returns unknown — tests want loose access.
export function json(res: Response): Promise<any> {
  return res.json() as Promise<any>;
}

export const TEST_KEY = "ak_live_0123456789abcdef0123456789abcdef";

export function makeUser(overrides: Partial<ApiUser> = {}): ApiUser {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "client@acme.com",
    name: "Client",
    type: "user",
    bucketName: null,
    publicBaseUrl: null,
    emailDomain: null,
    allowedOrigins: [],
    repoId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// requireAuth selects {apiKey, user, settings} and flattens user+settings via
// toApiUser — split an ApiUser view back into those two raw rows for the fake
// db. Only the fields the middleware reads need to be present.
export function splitApiUser(user: ApiUser): {
  user: Record<string, unknown>;
  settings: Record<string, unknown>;
} {
  const {
    type,
    bucketName,
    publicBaseUrl,
    emailDomain,
    allowedOrigins,
    ...identity
  } = user;
  return {
    user: { ...identity, role: type },
    settings: {
      userId: user.id,
      bucketName,
      publicBaseUrl,
      emailDomain,
      allowedOrigins,
      createdAt: user.createdAt,
    },
  };
}

export function makeApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    userId: "11111111-1111-1111-1111-111111111111",
    keyHash: "set-by-seedAuth",
    prefix: "ak_live_012345",
    secretEnc: "irrelevant",
    lastUsedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    revokedAt: null,
    ...overrides,
  };
}

// Queue the two db results requireAuth consumes (join select + lastUsedAt
// update) and return the Authorization header value for TEST_KEY.
export async function seedAuth(
  user: ApiUser,
  key: Partial<ApiKey> = {}
): Promise<string> {
  const keyHash = await hashKey(TEST_KEY);
  const { user: userRow, settings } = splitApiUser(user);
  dbQueue.push([
    { apiKey: makeApiKey({ ...key, keyHash }), user: userRow, settings },
  ]);
  dbQueue.push([]); // lastUsedAt update
  return `Bearer ${TEST_KEY}`;
}

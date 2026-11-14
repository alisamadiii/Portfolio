/**
 * One-time backfill for account.encryptOAuthTokens: encrypts every OAuth
 * token (access, refresh, id) still stored as plain text in the account
 * table. Already-encrypted values are detected by decrypting them with the
 * auth secret and are left alone, so the script is safe to run twice.
 *
 * Needs the SAME BETTER_AUTH_SECRET as the api service (it is the key).
 * Run it right after deploying the api with encryption turned on.
 *
 * Run from the repo root:
 *   npx tsx packages/auth/scripts/encrypt-oauth-tokens.mts            # dry run
 *   npx tsx packages/auth/scripts/encrypt-oauth-tokens.mts --commit   # real run
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const COMMIT = process.argv.includes("--commit");
if (!process.env.BETTER_AUTH_SECRET) {
  console.error("BETTER_AUTH_SECRET is not set");
  process.exit(1);
}

const { db } = await import("@workspace/drizzle/index");
const { account } = await import("@workspace/drizzle/schema");
const { auth } = await import("@workspace/auth/auth");
const { symmetricDecrypt, symmetricEncrypt } = await import("better-auth/crypto");

const ctx = await auth.$context;
const key = ctx.secretConfig;

const isEncrypted = async (value: string) => {
  try {
    await symmetricDecrypt({ key, data: value });
    return true;
  } catch {
    return false;
  }
};

console.log(
  `Encrypt OAuth tokens ${COMMIT ? "(COMMIT)" : "(dry run)"} | db: ${new URL(process.env.DATABASE_URL!).host}\n`
);

const rows = await db
  .select({
    id: account.id,
    providerId: account.providerId,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    idToken: account.idToken,
  })
  .from(account);

const FIELDS = ["accessToken", "refreshToken", "idToken"] as const;
let changedRows = 0;
let changedTokens = 0;

for (const row of rows) {
  const update: Partial<Record<(typeof FIELDS)[number], string>> = {};
  for (const field of FIELDS) {
    const value = row[field];
    if (!value || (await isEncrypted(value))) continue;
    update[field] = await symmetricEncrypt({ key, data: value });
  }
  const n = Object.keys(update).length;
  if (!n) continue;
  changedRows++;
  changedTokens += n;
  console.log(`${row.providerId.padEnd(10)} ${row.id}  ${Object.keys(update).join(", ")}`);
  if (COMMIT) await db.update(account).set(update).where(eq(account.id, row.id));
}

console.log(
  `\n${rows.length} accounts, ${changedRows} with plaintext tokens (${changedTokens} tokens) ${COMMIT ? "encrypted" : "to encrypt. Re-run with --commit"}`
);
process.exit(0);

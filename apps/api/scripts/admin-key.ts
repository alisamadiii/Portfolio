// Bootstrap / recover an admin API key — the escape hatch for the chicken-and-egg
// problem that every other way of minting a key (POST /v1/admin/keys) itself
// requires an admin key to authenticate. Talks to Postgres directly for that
// reason; it is the ONE place allowed to.
//
//   pnpm admin:key                      show admin@local's active keys (decrypted)
//   pnpm admin:key --new                mint a fresh ak_ser_ key
//   pnpm admin:key --email a@b.com      operate on a different user
//   pnpm admin:key --type public        mint ak_pub_ instead of ak_ser_
//
// Default (no flags) never writes: if a key already exists it is decrypted and
// printed, so losing your copy is not a reason to mint another one. It only
// inserts when there is nothing to recover, or when you pass --new.
//
// Reads DATABASE_URL and KEY_ENC_SECRET from .dev.vars, so it hits whichever
// database that file points at — check it before trusting the output.
//
// PRINTS SECRETS TO STDOUT. Don't run it in shared terminals or CI logs.
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

import {
  decryptSecret,
  encryptSecret,
  generateApiKey,
  keyTypeFromPrefix,
  type ApiKeyType,
} from "../src/lib/keys.js";

// .dev.vars is dotenv-ish: KEY=value, blank lines, no export/interpolation.
function loadDevVars(path = ".dev.vars"): Record<string, string> {
  if (!fs.existsSync(path)) {
    throw new Error(`${path} not found — run this from the repo root.`);
  }
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i).trim(),
          line
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      })
  );
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const email = arg("email") ?? "admin@local";
const mintNew = process.argv.includes("--new");
const type = (arg("type") ?? "server") as ApiKeyType;
if (type !== "server" && type !== "public") {
  throw new Error(`--type must be "server" or "public", got "${type}"`);
}

const env = loadDevVars();
for (const required of ["DATABASE_URL", "KEY_ENC_SECRET"]) {
  if (!env[required]) throw new Error(`${required} missing from .dev.vars`);
}
// Never print the connection string itself — it carries the password.
const dbHost = new URL(env.DATABASE_URL).hostname;
const sql = neon(env.DATABASE_URL);

const [user] = await sql`
  select id, email, type from users where email = ${email} limit 1`;
if (!user) {
  throw new Error(
    `No user with email "${email}". Existing users: ` +
      (await sql`select email from users order by created_at`)
        .map((r) => r.email)
        .join(", ")
  );
}

console.log(`db      ${dbHost}`);
console.log(`user    ${user.email} (type: ${user.type})`);
if (user.type !== "admin") {
  // Not fatal — a server key for a regular user is a legitimate thing to want —
  // but it will NOT open /v1/admin/*, which is usually why you ran this.
  console.log(
    `\n!  This user is type "${user.type}", not "admin". Its keys cannot call /v1/admin/*.`
  );
}

const active = await sql`
  select id, prefix, secret_enc, last_used_at, created_at
  from api_keys
  where user_id = ${user.id} and revoked_at is null
  order by created_at desc`;

if (active.length > 0 && !mintNew) {
  // Recover rather than mint: an extra key is another live credential to track.
  console.log(
    `\n${active.length} active key(s) — decrypted below, none created.`
  );
  for (const k of active) {
    const value = await decryptSecret(k.secret_enc, env.KEY_ENC_SECRET);
    console.log(`\n  id        ${k.id}`);
    console.log(`  type      ${keyTypeFromPrefix(k.prefix)}`);
    console.log(`  lastUsed  ${k.last_used_at ?? "never"}`);
    console.log(`  key       ${value}`);
  }
  console.log(`\nWant an additional key anyway? Re-run with --new`);
  process.exit(0);
}

const { key, prefix, keyHash } = await generateApiKey(type);
const secretEnc = await encryptSecret(key, env.KEY_ENC_SECRET);
const [row] = await sql`
  insert into api_keys (user_id, key_hash, prefix, secret_enc)
  values (${user.id}, ${keyHash}, ${prefix}, ${secretEnc})
  returning id, prefix`;

console.log(
  `\nCreated ${type} key${active.length ? ` (${active.length} already existed)` : ""}:`
);
console.log(`\n  id        ${row.id}`);
console.log(`  key       ${key}`);
console.log(
  `\n${
    type === "server"
      ? "Server key: works from any origin, or none. Keep it server-side."
      : "Public key: only works from the user's allowedOrigins."
  }`
);
console.log(
  `Recoverable later by re-running this script, or via /v1/admin/keys/:id/reveal.`
);

// One-off data migration: copy the old agency-api Neon DB into the portfolio
// Neon DB (merged schema). Run manually — see apps/api/MIGRATION.md.
//
//   OLD_DATABASE_URL=postgres://... NEW_DATABASE_URL=postgres://... \
//     pnpm tsx scripts/migrate-api-db.ts
//
// What it does, in order:
//   1. Every old `users` row becomes (or attaches to) a Better Auth `user`
//      row, matched by email. Existing portfolio accounts are reused;
//      missing ones are created with isClient=true. Old type "admin" → role.
//   2. ALL API-specific fields (bucket_name, public_base_url, email_domain,
//      allowed_origins, created_at) are copied verbatim into
//      api_client_settings — nothing is re-entered by hand.
//   3. api_keys / email_logs / env_files are copied with user_id remapped to
//      the Better Auth id. key_hash, secret_enc, prefix and timestamps are
//      preserved byte-for-byte, so existing client keys keep working as long
//      as KEY_ENC_SECRET is unchanged (do NOT rotate it).
//
// Idempotent: settings upsert, everything else ON CONFLICT DO NOTHING —
// re-running is safe. Never deletes or overwrites portfolio data.
import { neon } from "@neondatabase/serverless";

const OLD_URL = process.env.OLD_DATABASE_URL;
const NEW_URL = process.env.NEW_DATABASE_URL;
if (!OLD_URL || !NEW_URL) {
  throw new Error("Set OLD_DATABASE_URL and NEW_DATABASE_URL env vars.");
}

const oldDb = neon(OLD_URL);
const newDb = neon(NEW_URL);

console.log(`old db  ${new URL(OLD_URL).hostname}`);
console.log(`new db  ${new URL(NEW_URL).hostname}\n`);

// ── 1 + 2. users → user + api_client_settings ───────────────────────────────

const oldUsers = await oldDb`select * from users order by created_at`;
// old uuid → Better Auth user id
const idMap = new Map<string, string>();
let usersCreated = 0;
let usersAttached = 0;

for (const u of oldUsers) {
  const [existing] = await newDb`
    select id from "user" where email = ${u.email} limit 1`;

  let newId: string;
  if (existing) {
    newId = existing.id as string;
    // Attach API access to the portfolio account; never downgrade a role.
    await newDb`
      update "user" set
        is_client = true,
        role = case when ${u.type} = 'admin' then 'admin' else role end
      where id = ${newId}`;
    usersAttached++;
  } else {
    newId = crypto.randomUUID();
    await newDb`
      insert into "user"
        (id, name, email, email_verified, created_at, updated_at, role, is_client)
      values
        (${newId}, ${u.name ?? u.email}, ${u.email}, false,
         ${u.created_at}, now(), ${u.type}, true)`;
    usersCreated++;
  }
  idMap.set(u.id as string, newId);

  // Verbatim copy of every API field — re-run refreshes to the old DB's state.
  await newDb`
    insert into api_client_settings
      (user_id, bucket_name, public_base_url, email_domain, allowed_origins, created_at)
    values
      (${newId}, ${u.bucket_name}, ${u.public_base_url}, ${u.email_domain},
       ${u.allowed_origins}, ${u.created_at})
    on conflict (user_id) do update set
      bucket_name = excluded.bucket_name,
      public_base_url = excluded.public_base_url,
      email_domain = excluded.email_domain,
      allowed_origins = excluded.allowed_origins`;
}
console.log(
  `users            ${oldUsers.length} processed (${usersCreated} created, ${usersAttached} attached to existing accounts)`
);

const remap = (oldId: string): string => {
  const id = idMap.get(oldId);
  if (!id) throw new Error(`No mapped user for old user_id ${oldId}`);
  return id;
};

// ── 3. api_keys / email_logs / env_files ────────────────────────────────────

const keys = await oldDb`select * from api_keys order by created_at`;
for (const k of keys) {
  await newDb`
    insert into api_keys
      (id, user_id, key_hash, prefix, secret_enc, last_used_at, created_at, revoked_at)
    values
      (${k.id}, ${remap(k.user_id)}, ${k.key_hash}, ${k.prefix},
       ${k.secret_enc}, ${k.last_used_at}, ${k.created_at}, ${k.revoked_at})
    on conflict (id) do nothing`;
}
console.log(`api_keys         ${keys.length} copied`);

const logs = await oldDb`select * from email_logs order by created_at`;
for (const l of logs) {
  await newDb`
    insert into email_logs
      (id, user_id, kind, from_address, "to", subject, message_id, r2_key,
       visitor_email, source, created_at)
    values
      (${l.id}, ${remap(l.user_id)}, ${l.kind}, ${l.from_address}, ${l.to},
       ${l.subject}, ${l.message_id}, ${l.r2_key}, ${l.visitor_email},
       ${l.source}, ${l.created_at})
    on conflict (id) do nothing`;
}
console.log(`email_logs       ${logs.length} copied`);

const envs = await oldDb`select * from env_files order by created_at`;
for (const e of envs) {
  await newDb`
    insert into env_files
      (id, user_id, description, content_enc, var_count, created_at, updated_at)
    values
      (${e.id}, ${remap(e.user_id)}, ${e.description}, ${e.content_enc},
       ${e.var_count}, ${e.created_at}, ${e.updated_at})
    on conflict (id) do nothing`;
}
console.log(`env_files        ${envs.length} copied`);

console.log("\nDone. Verify with: pnpm admin:key (against the new DB).");

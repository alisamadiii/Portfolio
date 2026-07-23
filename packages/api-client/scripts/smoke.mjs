// Read-only smoke test against the live API. Run after `pnpm run build`:
//   AGENCY_API_KEY=ak_pub_... node scripts/smoke.mjs
// Deliberately never calls emails.send (real email + rate limit).
import { AgencyClient } from "../dist/index.js";

const apiKey = process.env.AGENCY_API_KEY;
if (!apiKey) {
  console.error("Set AGENCY_API_KEY");
  process.exit(1);
}

const agency = new AgencyClient(apiKey, {
  baseUrl: process.env.AGENCY_BASE_URL,
});

const me = await agency.me.get();
if (me.error) {
  console.error(
    "me.get failed:",
    me.error.status,
    me.error.code,
    me.error.message
  );
  process.exit(1);
}
console.log("me:", me.data.keyPrefix, me.data.user.email, me.data.user.type);

const list = await agency.uploads.list();
if (list.error) {
  console.error(
    "uploads.list failed:",
    list.error.status,
    list.error.code,
    list.error.message
  );
  process.exit(1);
}
console.log(
  `objects: ${list.data.objects.length} (nextCursor: ${list.data.nextCursor})`
);
for (const o of list.data.objects.slice(0, 5)) {
  console.log(" -", o.key, o.size, o.url);
}

console.log("smoke OK");

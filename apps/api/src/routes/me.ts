import { Hono } from "hono";

import { keyTypeFromPrefix } from "../lib/keys.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

// "Which key is this?" — returns the calling key's prefix, type, and its user.
//
// Deliberately no env-file routes here. Stored .env files are admin-only
// (/v1/admin/envs): a client key is a credential that lives in someone else's
// project, and any route that hands a decrypted .env to a non-admin key turns
// one leaked key into every secret that client has.
export const me = new Hono<AppEnv>();

me.use("*", requireAuth);

me.get("/", (c) => {
  const { keyHash, secretEnc, ...key } = c.get("apiKey");
  return c.json({
    keyPrefix: key.prefix,
    keyType: keyTypeFromPrefix(key.prefix),
    user: c.get("user"),
  });
});

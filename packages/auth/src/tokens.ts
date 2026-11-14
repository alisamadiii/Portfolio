import { symmetricDecrypt } from "better-auth/crypto";

import { auth } from "./auth";

/**
 * Plain value of an OAuth token read straight from the account table. Tokens
 * are encrypted at rest (account.encryptOAuthTokens); a legacy plaintext
 * value doesn't decrypt and passes through unchanged. Null when missing.
 */
export async function readAccountToken(token: string | null | undefined) {
  if (!token) return null;
  const { secretConfig } = await auth.$context;
  try {
    return await symmetricDecrypt({ key: secretConfig, data: token });
  } catch {
    return token;
  }
}

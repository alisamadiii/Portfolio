import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";

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

/**
 * Encrypts a third-party token the hub stores itself (outside Better Auth's
 * account table) with the same key, so readAccountToken reads it back.
 */
export async function sealAccountToken(token: string) {
  const { secretConfig } = await auth.$context;
  return symmetricEncrypt({ key: secretConfig, data: token });
}

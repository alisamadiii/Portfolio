// PBKDF2 salt + hash of the env-reveal password. Not the password, not
// reversible. Rotate with: pnpm reveal-password
export const REVEAL_PASSWORD_SALT = "831bd0942f6bb38bf3781c1122cc2bee";
export const REVEAL_PASSWORD_HASH =
  "76b154d1b3887c5d70fcefb28cbdee8c86f3f1bf70e7f19799fb0af5f7d89705";

// Generate the PBKDF2 salt + hash for the env-reveal vault password.
//
//   pnpm reveal-password
//
// Prompts for the password with the terminal echo off, derives the hash, and
// prints the two constants to paste into src/lib/reveal-password.ts. The
// password itself is never written to disk, never passed as an argv (which
// would land in shell history and `ps`), and never printed back.
//
// Rotating is the same command: run it, paste the new pair, done. Old envs are
// unaffected — the password guards the reveal route, it is not the encryption
// key.
import crypto from "node:crypto";
import readline from "node:readline";

import { hashPassword, PBKDF2_ITERATIONS } from "../src/lib/keys.js";

// Read a line without echoing it. readline's own hidden-input support is
// awkward on some terminals, so mute the output stream while typing.
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const target = rl as unknown as { _writeToOutput: (s: string) => void };
    const original = target._writeToOutput.bind(rl);
    let muted = false;
    target._writeToOutput = (s: string) => {
      if (!muted) original(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

const password = await promptHidden("New reveal password: ");
if (!password) {
  console.error("Aborted: empty password.");
  process.exit(1);
}
const again = await promptHidden("Confirm: ");
if (password !== again) {
  console.error("Aborted: the two entries do not match.");
  process.exit(1);
}

// A short or predictable password is the one thing PBKDF2 can't fully save you
// from, so say so rather than silently accepting it.
if (password.length < 12) {
  console.warn(
    `\n  Warning: ${password.length} characters. Aim for 5+ random words or 20+ random characters —\n  PBKDF2 slows guessing down, it doesn't make a guessable password safe.\n`
  );
}

const salt = crypto.randomBytes(16).toString("hex");
const start = Date.now();
const hash = await hashPassword(password, salt);
const elapsed = Date.now() - start;

console.log(`
Derived in ${elapsed}ms with ${PBKDF2_ITERATIONS.toLocaleString()} iterations.
That cost is per guess — it is what makes an offline crack expensive.

Paste these into src/lib/reveal-password.ts:

export const REVEAL_PASSWORD_SALT =
  "${salt}";
export const REVEAL_PASSWORD_HASH =
  "${hash}";
`);

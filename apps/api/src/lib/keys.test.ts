import { describe, expect, it } from "vitest";

import {
  generateApiKey,
  hashKey,
  hashPassword,
  keyTypeFromPrefix,
} from "./keys.js";

describe("generateApiKey", () => {
  it("defaults to a public ak_pub_ key", async () => {
    const { key, prefix } = await generateApiKey();
    expect(key).toMatch(/^ak_pub_[0-9a-f]{32}$/);
    // Stored prefix is the 7-char base + 6 hex (legacy ak_live_ was 8 + 6).
    expect(prefix).toBe(key.slice(0, 13));
  });

  it("mints an ak_ser_ key for the server type", async () => {
    const { key, prefix } = await generateApiKey("server");
    expect(key).toMatch(/^ak_ser_[0-9a-f]{32}$/);
    expect(prefix).toBe(key.slice(0, 13));
  });

  it("returns the sha-256 of the key, not the key itself", async () => {
    const { key, keyHash } = await generateApiKey();
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(keyHash).not.toContain(key);
  });

  it("does not repeat", async () => {
    const keys = await Promise.all([generateApiKey(), generateApiKey()]);
    expect(keys[0].key).not.toBe(keys[1].key);
  });
});

describe("keyTypeFromPrefix", () => {
  it("classifies the two current prefixes", () => {
    expect(keyTypeFromPrefix("ak_ser_012345")).toBe("server");
    expect(keyTypeFromPrefix("ak_pub_012345")).toBe("public");
  });

  it("treats legacy ak_live_ keys as public", () => {
    expect(keyTypeFromPrefix("ak_live_012345")).toBe("public");
  });

  // Fail closed: anything unrecognised lands in the origin-checked path, so a
  // malformed prefix can never accidentally skip the origin gate.
  it("fails closed to public for unrecognised prefixes", () => {
    for (const p of ["", "garbage", "ak_", "AK_SER_012345", null]) {
      expect(keyTypeFromPrefix(p), String(p)).toBe("public");
    }
  });
});

describe("hashPassword", () => {
  const salt = "00112233445566778899aabbccddeeff";

  it("is deterministic for the same password and salt", async () => {
    expect(await hashPassword("hunter2", salt)).toBe(
      await hashPassword("hunter2", salt)
    );
  });

  it("returns a different hash for the same password under a different salt", async () => {
    const a = await hashPassword("hunter2", salt);
    const b = await hashPassword("hunter2", "ffeeddccbbaa99887766554433221100");
    expect(a).not.toBe(b);
  });

  it("is not a bare sha-256 of the password", async () => {
    // Guards the whole point of the change: if someone swaps the derivation
    // back to a fast hash, this fails.
    expect(await hashPassword("hunter2", salt)).not.toBe(
      await hashKey("hunter2")
    );
  });

  it("produces 64 hex chars", async () => {
    expect(await hashPassword("hunter2", salt)).toMatch(/^[0-9a-f]{64}$/);
  });
});

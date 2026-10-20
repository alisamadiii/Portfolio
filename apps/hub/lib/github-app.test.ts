import { createVerify, generateKeyPairSync } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { appJwt, isGithubAppConfigured } from "@workspace/trpc/lib/github-app/app-jwt";

// GitHub App JWT: the credential both the api webhook/link flow and the
// token-minting lib authenticate with. Pure crypto — no network, no db.

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

beforeAll(() => {
  process.env.GITHUB_APP_ID = "424242";
  process.env.GITHUB_APP_PRIVATE_KEY = Buffer.from(
    privateKey.export({ type: "pkcs1", format: "pem" }) as string
  ).toString("base64");
});

describe("appJwt", () => {
  it("is configured once both env vars are set", () => {
    expect(isGithubAppConfigured()).toBe(true);
  });

  it("produces a valid RS256 JWT with backdated iat and the app id as issuer", () => {
    const jwt = appJwt();
    const [header, payload, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    });
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    expect(claims.iss).toBe("424242");
    expect(claims.iat).toBeLessThanOrEqual(now - 55);
    expect(claims.iat).toBeGreaterThanOrEqual(now - 65);
    expect(claims.exp).toBeGreaterThan(now);
    expect(claims.exp).toBeLessThanOrEqual(now + 540);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(
      true
    );
  });

  it("rejects a tampered payload", () => {
    const jwt = appJwt();
    const [header, payload, signature] = jwt.split(".");
    const tampered = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, "base64url").toString()),
        iss: "999",
      })
    ).toString("base64url");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${tampered}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(
      false
    );
  });
});

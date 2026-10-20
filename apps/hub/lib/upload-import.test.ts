import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { signEditToken, signImportToken } from "@workspace/trpc/lib/cms/edit-token";
import {
  SYNTHETIC_REPO_ID_FLOOR,
  syntheticRepoId,
  uploadSlug,
} from "@workspace/trpc/lib/cms/upload-slug";

// Upload import flow (deploy.importUpload): slug + synthetic id helpers, and
// the import-token's scope separation from the edit token.

describe("uploadSlug", () => {
  it("lowercases and replaces disallowed characters with dashes", () => {
    expect(uploadSlug("My Site 2026")).toBe("my-site-2026");
    expect(uploadSlug("Sunrise Bakery!!")).toBe("sunrise-bakery");
  });

  it("drops a .zip extension", () => {
    expect(uploadSlug("portfolio.zip")).toBe("portfolio");
  });

  it("trims leading/trailing dashes and caps length", () => {
    expect(uploadSlug("---hello---")).toBe("hello");
    expect(uploadSlug("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it("falls back to 'site' when nothing survives", () => {
    expect(uploadSlug("***")).toBe("site");
    expect(uploadSlug(".zip")).toBe("site");
  });
});

describe("syntheticRepoId", () => {
  it("stays above the GitHub id range and within safe integers", () => {
    for (let i = 0; i < 100; i++) {
      const id = syntheticRepoId();
      expect(id).toBeGreaterThanOrEqual(SYNTHETIC_REPO_ID_FLOOR);
      expect(Number.isSafeInteger(id)).toBe(true);
    }
  });
});

const decodePayload = (token: string) =>
  JSON.parse(
    Buffer.from(token.split(".")[0]!, "base64url").toString("utf8")
  ) as Record<string, unknown>;

describe("signImportToken", () => {
  const SECRET = "test-secret";

  it("carries repoId, scope:'import' and an expiry", () => {
    const token = signImportToken({ repoId: 1000000000042 }, SECRET);
    const payload = decodePayload(token);
    expect(payload.repoId).toBe(1000000000042);
    expect(payload.scope).toBe("import");
    expect(payload.exp as number).toBeGreaterThan(Date.now() / 1000);
  });

  it("is signed with the same HMAC scheme as the edit token", () => {
    const token = signImportToken({ repoId: 7 }, SECRET);
    const [body, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET)
      .update(body!)
      .digest("base64url");
    expect(sig).toBe(expected);
  });

  it("edit tokens never carry a scope claim", () => {
    const token = signEditToken({ repoId: 7 }, SECRET);
    expect("scope" in decodePayload(token)).toBe(false);
  });
});

/**
 * Handler routing + serialization tests with auth/GitHub mocked at the module
 * boundary. The real Clerk/Octokit paths are covered by the end-to-end setup
 * against a scratch repo (see README/plan), not unit tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateMock = vi.fn();
const checkRepoAccessMock = vi.fn();
const readJsonFileMock = vi.fn();
const commitFilesAtomicMock = vi.fn();

vi.mock("../src/core/auth", () => ({
  authenticate: (...args: unknown[]) => authenticateMock(...args),
}));
vi.mock("../src/core/github", () => ({
  createOctokit: () => ({}),
  checkRepoAccess: (...args: unknown[]) => checkRepoAccessMock(...args),
  readJsonFile: (...args: unknown[]) => readJsonFileMock(...args),
}));
vi.mock("../src/core/commit", () => ({
  commitFilesAtomic: (...args: unknown[]) => commitFilesAtomicMock(...args),
}));

const { createAdminHandler } = await import("../src/core/handler");

const config = {
  clerkSecretKey: "sk_test",
  clerkPublishableKey: "pk_test",
  repo: "acme/site",
};

const handler = createAdminHandler(config);

beforeEach(() => {
  vi.clearAllMocks();
  authenticateMock.mockResolvedValue({ userId: "u1", githubToken: "gho_x" });
  checkRepoAccessMock.mockResolvedValue({ defaultBranch: "main" });
});

describe("createAdminHandler", () => {
  it("rejects an invalid repo at construction", () => {
    expect(() =>
      createAdminHandler({ ...config, repo: "not-a-repo" })
    ).toThrow(/owner\/name/);
  });

  it("401s when not signed in", async () => {
    authenticateMock.mockRejectedValue(
      Object.assign(new Error("Not signed in."), { status: 401 })
    );
    const response = await handler(
      new Request("https://x.test/api/admin/manifest")
    );
    expect(response.status).toBe(401);
  });

  it("serves the manifest with the resolved branch", async () => {
    readJsonFileMock.mockResolvedValue({
      sha: "abc",
      contentObject: { version: 1, pages: {}, collections: [] },
    });
    const response = await handler(
      new Request("https://x.test/api/admin/manifest")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ repo: "acme/site", branch: "main" });
    expect(readJsonFileMock).toHaveBeenCalledWith(expect.anything(), {
      owner: "acme",
      repo: "site",
      branch: "main",
      path: "src/data/cms.json",
    });
  });

  it("rejects content paths outside the contract", async () => {
    for (const path of [
      "package.json",
      "src/data/../secrets.json",
      "src/pages/index.astro",
      ".env",
    ]) {
      const response = await handler(
        new Request(
          `https://x.test/api/admin/content?path=${encodeURIComponent(path)}`
        )
      );
      expect(response.status, path).toBe(400);
    }
  });

  it("saves via one atomic commit and reports the new sha", async () => {
    commitFilesAtomicMock.mockResolvedValue({
      status: "success",
      commitSha: "c1",
      files: [{ path: "src/data/pages.json", sha: "s2" }],
    });
    const response = await handler(
      new Request("https://x.test/api/admin/content", {
        method: "POST",
        body: JSON.stringify({
          path: "src/data/pages.json",
          sha: "s1",
          contentObject: { home: { hero: { heading: "Hi" } } },
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "success",
      commitSha: "c1",
      sha: "s2",
    });

    const call = commitFilesAtomicMock.mock.calls[0]![0] as any;
    expect(call.files).toHaveLength(1);
    expect(call.files[0]).toMatchObject({
      path: "src/data/pages.json",
      sha: "s1",
      isNew: false,
    });
    // Pretty-printed with a trailing newline, matching the repo convention.
    expect(call.files[0].stringified).toBe(
      `${JSON.stringify({ home: { hero: { heading: "Hi" } } }, null, 2)}\n`
    );
    expect(call.force).toBe(false);
  });

  it("maps a commit conflict to 409", async () => {
    commitFilesAtomicMock.mockResolvedValue({
      status: "conflict",
      stalePaths: ["src/data/pages.json"],
      conflictPaths: [],
    });
    const response = await handler(
      new Request("https://x.test/api/admin/content", {
        method: "POST",
        body: JSON.stringify({
          path: "src/data/pages.json",
          sha: "stale",
          contentObject: {},
        }),
      })
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ status: "conflict" });
  });

  it("null sha marks the file as new", async () => {
    commitFilesAtomicMock.mockResolvedValue({
      status: "success",
      commitSha: "c1",
      files: [],
    });
    await handler(
      new Request("https://x.test/api/admin/content", {
        method: "POST",
        body: JSON.stringify({
          path: "src/data/collections/team.json",
          sha: null,
          contentObject: [],
        }),
      })
    );
    const call = commitFilesAtomicMock.mock.calls[0]![0] as any;
    expect(call.files[0].isNew).toBe(true);
  });

  it("404s unknown routes", async () => {
    const response = await handler(
      new Request("https://x.test/api/admin/nope")
    );
    expect(response.status).toBe(404);
  });
});

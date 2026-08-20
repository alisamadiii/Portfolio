import { beforeEach, describe, expect, it, vi } from "vitest";

import { dbQueue, fakeDb, json, testCtx, testEnv } from "../test/helpers.js";

vi.mock("../db/index.js", () => ({ createDb: () => fakeDb() }));

const { app } = await import("../app.js");

beforeEach(() => {
  dbQueue.length = 0;
});

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    repoId: 123,
    slug: "hello-world",
    title: "Hello World",
    description: "First post.",
    coverImage: null,
    coverImageAlt: null,
    body: "# Hello\n\nBody text.",
    tags: ["seo"],
    status: "published",
    publishedAt: new Date("2026-08-01T00:00:00Z"),
    createdBy: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("GET /v1/content/blog", () => {
  it("requires no auth and returns rendered markdown files", async () => {
    dbQueue.push([makePost()]);
    const res = await app.request(
      "/v1/content/blog?repoId=123",
      {},
      testEnv,
      testCtx
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.dir).toBe("src/content/blog");
    expect(body.files).toHaveLength(1);
    expect(body.files[0].path).toBe("hello-world.md");
    expect(body.files[0].content).toBe(
      [
        "---",
        'title: "Hello World"',
        'description: "First post."',
        'publishDate: "2026-08-01T00:00:00.000Z"',
        'tags: ["seo"]',
        "---",
        "# Hello",
        "",
        "Body text.",
        "",
      ].join("\n")
    );
  });

  it("escapes quotes/colons in frontmatter and adds updatedDate + cover", async () => {
    dbQueue.push([
      makePost({
        title: 'He said: "hi"',
        coverImage: "https://cdn.acme.com/a.jpg",
        coverImageAlt: "A photo",
        updatedAt: new Date("2026-08-10T00:00:00Z"),
      }),
    ]);
    const res = await app.request(
      "/v1/content/blog?repoId=123",
      {},
      testEnv,
      testCtx
    );
    const body = await json(res);
    const content: string = body.files[0].content;
    expect(content).toContain('title: "He said: \\"hi\\""');
    expect(content).toContain('updatedDate: "2026-08-10T00:00:00.000Z"');
    expect(content).toContain('coverImage: "https://cdn.acme.com/a.jpg"');
    expect(content).toContain('coverImageAlt: "A photo"');
  });

  it("rejects a missing or non-integer repoId", async () => {
    for (const qs of ["", "?repoId=abc", "?repoId=1.5", "?repoId=-2"]) {
      const res = await app.request(
        `/v1/content/blog${qs}`,
        {},
        testEnv,
        testCtx
      );
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error.code).toBe("INVALID_REPO_ID");
    }
  });

  it("returns an empty file list when the project has no published posts", async () => {
    dbQueue.push([]);
    const res = await app.request(
      "/v1/content/blog?repoId=999",
      {},
      testEnv,
      testCtx
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.files).toEqual([]);
  });
});

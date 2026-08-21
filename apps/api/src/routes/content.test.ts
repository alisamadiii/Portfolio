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
    keyword: "",
    heroImage: null,
    heroImageAlt: null,
    heroCredit: null,
    author: null,
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

  it("escapes quotes/colons in frontmatter and adds updatedDate + hero", async () => {
    dbQueue.push([
      makePost({
        title: 'He said: "hi"',
        heroImage: "https://cdn.acme.com/a.jpg",
        heroImageAlt: "A photo",
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
    expect(content).toContain('heroImage: "https://cdn.acme.com/a.jpg"');
    expect(content).toContain('heroImageAlt: "A photo"');
  });

  it("emits keyword, heroCredit, and author blocks when present", async () => {
    dbQueue.push([
      makePost({
        keyword: "amazon ses vs resend",
        heroImage: "https://cdn.acme.com/ses.webp",
        heroImageAlt: "An inbox",
        heroCredit: {
          name: "cottonbro studio",
          url: "https://www.pexels.com/@cottonbro",
          pexelsUrl: "https://www.pexels.com/photo/7439136/",
        },
        author: {
          name: "Ali Samadi",
          title: "Web Developer & Founder, Ali Samadi Agency",
          avatar: "https://cdn.alisamadii.com/avatar.jpeg",
          url: "https://www.alisamadii.com/",
        },
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
    expect(content).toContain('keyword: "amazon ses vs resend"');
    expect(content).toContain(
      [
        "heroCredit:",
        '  name: "cottonbro studio"',
        '  url: "https://www.pexels.com/@cottonbro"',
        '  pexelsUrl: "https://www.pexels.com/photo/7439136/"',
      ].join("\n")
    );
    expect(content).toContain(
      [
        "author:",
        '  name: "Ali Samadi"',
        '  title: "Web Developer & Founder, Ali Samadi Agency"',
        '  avatar: "https://cdn.alisamadii.com/avatar.jpeg"',
        '  url: "https://www.alisamadii.com/"',
      ].join("\n")
    );
    // keyword sits between description and publishDate
    expect(content.indexOf("keyword:")).toBeGreaterThan(
      content.indexOf("description:")
    );
    expect(content.indexOf("keyword:")).toBeLessThan(
      content.indexOf("publishDate:")
    );
  });

  it("omits keyword/heroCredit/author when empty", async () => {
    dbQueue.push([makePost()]);
    const res = await app.request(
      "/v1/content/blog?repoId=123",
      {},
      testEnv,
      testCtx
    );
    const body = await json(res);
    const content: string = body.files[0].content;
    expect(content).not.toContain("keyword:");
    expect(content).not.toContain("heroCredit:");
    expect(content).not.toContain("author:");
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

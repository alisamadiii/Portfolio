import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "@workspace/trpc/lib/db-errors";

// Regression: re-importing an upload named like a deleted one failed because
// drizzle wraps the driver error ("Failed query: insert into hub_project…")
// and the old message regex never saw the unique violation on `cause`.
describe("isUniqueViolation", () => {
  it("finds a 23505 on the wrapped cause", () => {
    const pg = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
    });
    const wrapped = new Error('Failed query: insert into "hub_project" …', {
      cause: pg,
    });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("matches a bare unique error by code or message", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(
      isUniqueViolation(new Error('violates unique constraint "uq_hub_project_owner_repo_ci"'))
    ).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isUniqueViolation(new Error("Failed query: insert …"))).toBe(false);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

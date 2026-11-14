import { describe, expect, it } from "vitest";

import { CONNECT_ERROR_PARAM, connectErrorMessage, connectErrorURL } from "./connect-errors";

describe("connectErrorURL", () => {
  it("tags the current page with the app, keeping its other params", () => {
    const url = new URL(connectErrorURL("Resend", "https://app.alisamadii.com/p/1/resend?tab=keys"));
    expect(url.pathname).toBe("/p/1/resend");
    expect(url.searchParams.get("tab")).toBe("keys");
    expect(url.searchParams.get(CONNECT_ERROR_PARAM)).toBe("Resend");
  });
});

describe("connectErrorMessage", () => {
  it("explains known Better Auth codes", () => {
    expect(connectErrorMessage("Netlify", "access_denied")).toBe("Connecting Netlify was cancelled.");
    expect(connectErrorMessage("Resend", "account_already_linked_to_different_user")).toMatch(
      /already linked to another Client Hub user/
    );
  });

  it("falls back to a generic message (e.g. name_is_missing, no code)", () => {
    expect(connectErrorMessage("Resend", "name_is_missing")).toMatch(/^Couldn't connect Resend\./);
    expect(connectErrorMessage("Neon", null)).toMatch(/^Couldn't connect Neon\./);
  });
});

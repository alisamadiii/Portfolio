import { describe, expect, it } from "vitest";

import {
  NETLIFY_APEX_IP,
  dnsRecordFor,
  isApexDomain,
  normalizeDomain,
  planNetlifyHost,
} from "@workspace/trpc/lib/netlify-shared";

describe("normalizeDomain", () => {
  it("strips protocol, path, port and case", () => {
    expect(normalizeDomain("https://WWW.Example.com/about?x=1")).toBe("www.example.com");
    expect(normalizeDomain("example.com:8080")).toBe("example.com");
    expect(normalizeDomain(" shop.example.co.uk. ")).toBe("shop.example.co.uk");
  });

  it("rejects things that aren't domains", () => {
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("-bad.com")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });
});

describe("isApexDomain", () => {
  it("treats two-label and known multi-part suffix domains as apex", () => {
    expect(isApexDomain("example.com")).toBe(true);
    expect(isApexDomain("example.co.uk")).toBe(true);
    expect(isApexDomain("www.example.com")).toBe(false);
    expect(isApexDomain("www.example.co.uk")).toBe(false);
  });
});

describe("dnsRecordFor", () => {
  it("points an apex domain at Netlify's load balancer IP", () => {
    expect(dnsRecordFor("example.com", "site.netlify.app")).toEqual({
      type: "A",
      name: "@",
      value: NETLIFY_APEX_IP,
    });
  });

  it("points a subdomain at the site with a CNAME", () => {
    expect(dnsRecordFor("www.example.com", "site.netlify.app")).toEqual({
      type: "CNAME",
      name: "www",
      value: "site.netlify.app",
    });
    expect(dnsRecordFor("shop.blog.example.co.uk", "site.netlify.app").name).toBe("shop.blog");
  });
});

// Who hosts a publish (2026-11-15): clients on their own Netlify, the agency
// account only when an admin publishes.
describe("planNetlifyHost", () => {
  // Project-scoped since 2026-11-20: the caller's own Netlify connection no
  // longer matters; only the project row (site, pinned account, owner's
  // connection) decides. callerIsAdmin only unlocks creating a site on the
  // agency account.
  const base = {
    siteExists: false,
    pinnedUserId: null as string | null,
    ownerConnectedUserId: null as string | null,
    callerIsAdmin: false,
  };

  it("existing site pinned to a user deploys with that user's token", () => {
    // STALE (deliberate): host was "own" for the pinned user and "owner" for an
    // admin; the host no longer depends on who clicks.
    expect(planNetlifyHost({ ...base, siteExists: true, pinnedUserId: "client" })).toEqual({
      action: "deploy",
      host: "owner",
      tokenUserId: "client",
      createSite: false,
    });
    expect(
      planNetlifyHost({ ...base, siteExists: true, pinnedUserId: "client", callerIsAdmin: true })
    ).toMatchObject({ action: "deploy", host: "owner", tokenUserId: "client" });
  });

  it("agency-owned site: admin deploys with the agency token", () => {
    expect(planNetlifyHost({ ...base, siteExists: true, callerIsAdmin: true })).toEqual({
      action: "deploy",
      host: "agency",
      tokenUserId: null,
      createSite: false,
    });
  });

  it("agency-owned site: a client publish deploys it too (was agency_managed)", () => {
    // STALE (deliberate): used to return { action: "agency_managed" } and skip
    // the deploy. That was the reported bug: the owner clicked Publish and
    // nothing reached Netlify.
    expect(planNetlifyHost({ ...base, siteExists: true })).toEqual({
      action: "deploy",
      host: "agency",
      tokenUserId: null,
      createSite: false,
    });
  });

  it("no site, admin: owner's Netlify when connected, else agency", () => {
    const admin = { ...base, callerIsAdmin: true };
    expect(planNetlifyHost({ ...admin, ownerConnectedUserId: "client" })).toEqual({
      action: "deploy",
      host: "owner",
      tokenUserId: "client",
      createSite: true,
    });
    expect(planNetlifyHost(admin)).toEqual({
      action: "deploy",
      host: "agency",
      tokenUserId: null,
      createSite: true,
    });
  });

  it("no site, owner connected: created on the owner's Netlify", () => {
    // STALE (deliberate): was "client connected → own Netlify" keyed on the
    // caller's connection.
    expect(planNetlifyHost({ ...base, ownerConnectedUserId: "client" })).toEqual({
      action: "deploy",
      host: "owner",
      tokenUserId: "client",
      createSite: true,
    });
  });

  it("no site, no owner Netlify, non-admin: needs Netlify, never falls back to the agency", () => {
    // STALE (deliberate): a collaborator with the owner connected used to get
    // needs_netlify; that case now deploys to the owner (see next tests).
    expect(planNetlifyHost(base)).toEqual({ action: "needs_netlify" });
  });

  it("site on agency Netlify, client publishes: deploys with agency token", () => {
    expect(planNetlifyHost({ ...base, siteExists: true, pinnedUserId: null })).toMatchObject({
      action: "deploy",
      tokenUserId: null,
    });
  });

  it("site pinned to owner, collaborator publishes: deploys with owner token", () => {
    expect(planNetlifyHost({ ...base, siteExists: true, pinnedUserId: "owner" })).toEqual({
      action: "deploy",
      host: "owner",
      tokenUserId: "owner",
      createSite: false,
    });
  });

  it("no site, owner connected, collaborator publishes: created on owner's Netlify", () => {
    expect(planNetlifyHost({ ...base, ownerConnectedUserId: "owner" })).toEqual({
      action: "deploy",
      host: "owner",
      tokenUserId: "owner",
      createSite: true,
    });
  });

  it("linked site ignores the owner's connection: pinned token wins", () => {
    expect(
      planNetlifyHost({ ...base, siteExists: true, pinnedUserId: null, ownerConnectedUserId: "owner" })
    ).toMatchObject({ host: "agency", tokenUserId: null, createSite: false });
  });
});

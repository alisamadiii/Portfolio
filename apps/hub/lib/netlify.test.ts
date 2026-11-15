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
  const base = {
    siteExists: false,
    pinnedUserId: null as string | null,
    callerId: "client",
    callerIsAdmin: false,
    callerConnected: false,
    ownerId: "client" as string | null,
    ownerConnected: false,
  };

  it("existing site pinned to a user deploys with that user's token", () => {
    expect(planNetlifyHost({ ...base, siteExists: true, pinnedUserId: "client" })).toEqual({
      action: "deploy",
      host: "own",
      tokenUserId: "client",
      createSite: false,
    });
    expect(
      planNetlifyHost({ ...base, siteExists: true, pinnedUserId: "client", callerId: "admin", callerIsAdmin: true })
    ).toMatchObject({ action: "deploy", host: "owner", tokenUserId: "client" });
  });

  it("agency-owned site: admin deploys with the agency token", () => {
    expect(
      planNetlifyHost({ ...base, siteExists: true, callerId: "admin", callerIsAdmin: true })
    ).toEqual({ action: "deploy", host: "agency", tokenUserId: null, createSite: false });
  });

  it("agency-owned site: a client never deploys it, even with Netlify connected", () => {
    expect(planNetlifyHost({ ...base, siteExists: true, callerConnected: true })).toEqual({
      action: "agency_managed",
    });
  });

  it("no site, admin: owner's Netlify when connected, else agency", () => {
    const admin = { ...base, callerId: "admin", callerIsAdmin: true };
    expect(planNetlifyHost({ ...admin, ownerConnected: true })).toEqual({
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
    expect(planNetlifyHost({ ...admin, ownerId: null })).toMatchObject({ host: "agency" });
  });

  it("no site, client connected: created on the client's own Netlify", () => {
    expect(planNetlifyHost({ ...base, callerConnected: true })).toEqual({
      action: "deploy",
      host: "own",
      tokenUserId: "client",
      createSite: true,
    });
  });

  it("no site, client not connected: needs Netlify, never falls back to the agency", () => {
    expect(planNetlifyHost(base)).toEqual({ action: "needs_netlify" });
    // Even when the owner (someone else) connected theirs.
    expect(planNetlifyHost({ ...base, callerId: "collab", ownerConnected: true })).toEqual({
      action: "needs_netlify",
    });
  });
});

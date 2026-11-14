import { describe, expect, it } from "vitest";

import {
  NETLIFY_APEX_IP,
  dnsRecordFor,
  isApexDomain,
  normalizeDomain,
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

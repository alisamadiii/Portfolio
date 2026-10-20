import { describe, expect, it } from "vitest";

import { checkCname, type DnsResolverLike } from "@workspace/trpc/lib/dns-check";

const noRecord = () => {
  const error = new Error("no record") as Error & { code: string };
  error.code = "ENOTFOUND";
  return error;
};

const resolver = (overrides: Partial<DnsResolverLike>): DnsResolverLike => ({
  resolveCname: async () => {
    throw noRecord();
  },
  resolve4: async () => {
    throw noRecord();
  },
  ...overrides,
});

describe("checkCname", () => {
  it("ok when the CNAME matches, case and dot insensitive", async () => {
    const result = await checkCname(
      "www.client.com",
      "fallback.alisamadii.dev",
      resolver({ resolveCname: async () => ["Fallback.Alisamadii.DEV."] })
    );
    expect(result.state).toBe("ok");
  });

  it("wrong_target when the CNAME points elsewhere", async () => {
    const result = await checkCname(
      "www.client.com",
      "fallback.alisamadii.dev",
      resolver({ resolveCname: async () => ["other.example.com"] })
    );
    expect(result).toEqual({ state: "wrong_target", value: "other.example.com" });
  });

  it("a_record when only an A record answers", async () => {
    const result = await checkCname(
      "www.client.com",
      "fallback.alisamadii.dev",
      resolver({ resolve4: async () => ["1.2.3.4"] })
    );
    expect(result).toEqual({ state: "a_record", value: "1.2.3.4" });
  });

  it("not_found when nothing resolves", async () => {
    const result = await checkCname(
      "www.client.com",
      "fallback.alisamadii.dev",
      resolver({})
    );
    expect(result.state).toBe("not_found");
  });

  it("error on unexpected resolver failures", async () => {
    const result = await checkCname(
      "www.client.com",
      "fallback.alisamadii.dev",
      resolver({
        resolveCname: async () => {
          throw new Error("timeout");
        },
      })
    );
    expect(result.state).toBe("error");
  });
});

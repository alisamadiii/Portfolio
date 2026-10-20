import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCustomHostname,
  deleteCustomHostname,
  findCustomHostnameByName,
  getCustomHostname,
  isCloudflareSaasConfigured,
} from "@workspace/trpc/lib/cloudflare-saas";

const envelope = (result: unknown, success = true, errors: unknown[] = []) => ({
  ok: true,
  json: async () => ({ success, errors, result }),
});

describe("cloudflare-saas client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.CF_API_TOKEN = "token";
    process.env.CF_SAAS_ZONE_ID = "zone123";
    process.env.CF_SAAS_CNAME_TARGET = "fallback.alisamadii.dev";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CF_API_TOKEN;
    delete process.env.CF_SAAS_ZONE_ID;
    delete process.env.CF_SAAS_CNAME_TARGET;
  });

  it("is unconfigured when any env is missing", () => {
    expect(isCloudflareSaasConfigured()).toBe(true);
    delete process.env.CF_API_TOKEN;
    expect(isCloudflareSaasConfigured()).toBe(false);
  });

  it("creates a custom hostname with http DV validation", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope({ id: "ch1", hostname: "www.client.com", status: "pending", ssl: { status: "pending_validation" } })
    );
    const result = await createCustomHostname("www.client.com");
    expect(result.id).toBe("ch1");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.cloudflare.com/client/v4/zones/zone123/custom_hostnames"
    );
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      hostname: "www.client.com",
      ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
    });
    expect(
      (init as RequestInit).headers as Record<string, string>
    ).toMatchObject({ authorization: "Bearer token" });
  });

  it("surfaces Cloudflare envelope errors", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(null, false, [{ code: 1400, message: "Invalid hostname" }])
    );
    await expect(createCustomHostname("bad")).rejects.toThrow(/Invalid hostname/);
  });

  it("maps quota errors to a friendly message", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(null, false, [{ message: "custom hostname quota exceeded" }])
    );
    await expect(createCustomHostname("www.client.com")).rejects.toThrow(
      /limit reached/
    );
  });

  it("findCustomHostnameByName adopts an existing hostname", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope([{ id: "ch9", hostname: "www.client.com", status: "pending", ssl: { status: "pending_validation" } }])
    );
    const found = await findCustomHostnameByName("www.client.com");
    expect(found?.id).toBe("ch9");
    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      "custom_hostnames?hostname=www.client.com"
    );
  });

  it("getCustomHostname returns null when the hostname is gone", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(null, false, [{ code: 1436, message: "Custom hostname not found" }])
    );
    expect(await getCustomHostname("ch-gone")).toBeNull();
  });

  it("deleteCustomHostname tolerates not-found", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(null, false, [{ message: "Custom hostname not found" }])
    );
    await expect(deleteCustomHostname("ch-gone")).resolves.toBeUndefined();
  });

  it("throws the unconfigured guard without env", async () => {
    delete process.env.CF_SAAS_ZONE_ID;
    await expect(createCustomHostname("www.client.com")).rejects.toThrow(
      /not configured/
    );
  });
});

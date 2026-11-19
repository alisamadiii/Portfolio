import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { canRestart, isFinalStatus, STATUS_META } from "@workspace/trpc/lib/doordash-constants";
import {
  candidateAddress,
  doordashEnv,
  doordashHosts,
  JWT_MAX_TTL_SECONDS,
  mapCandidate,
  mintPartnerJwt,
  onboardingStatus,
  onboardingUpdate,
  signDoorDashState,
  verifyDoorDashState,
  verifyDoorDashWebhookToken,
} from "@workspace/trpc/lib/doordash-shared";

const SECRET = "test-secret";
const decode = (segment: string) => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

describe("doordashHosts", () => {
  it("has one host for both environments and only labels production", () => {
    expect(doordashHosts()).toEqual({ auth: "https://identity.doordash.com", api: "https://openapi.doordash.com" });
    expect(doordashEnv(undefined)).toBe("sandbox");
    expect(doordashEnv("prod")).toBe("sandbox");
    expect(doordashEnv("production")).toBe("production");
  });

  it("local overrides replace either host and drop a trailing slash", () => {
    expect(doordashHosts({ auth: "http://localhost:4011/", api: "http://localhost:4011" })).toEqual({
      auth: "http://localhost:4011",
      api: "http://localhost:4011",
    });
    expect(doordashHosts({ auth: "", api: null })).toEqual(doordashHosts());
  });
});

describe("mintPartnerJwt", () => {
  const key = {
    developerId: "11111111-2222-4333-8444-555555555555",
    keyId: "66666666-7777-4888-8999-000000000000",
    signingSecret: Buffer.from("raw-signing-secret-bytes").toString("base64url"),
  };

  it("builds DoorDash's HS256 token: dd-ver header, doordash audience, 5-minute expiry", () => {
    const now = 1_700_000_000_000;
    const { token, exp } = mintPartnerJwt(key, now);
    const [h, p, s] = token.split(".");
    expect(decode(h!)).toEqual({ alg: "HS256", typ: "JWT", "dd-ver": "DD-JWT-V1" });
    expect(decode(p!)).toEqual({
      aud: "doordash",
      iss: key.developerId,
      kid: key.keyId,
      iat: 1_700_000_000,
      exp: 1_700_000_300,
    });
    expect(exp).toBe(1_700_000_300_000);
    const expected = createHmac("sha256", Buffer.from("raw-signing-secret-bytes")).update(`${h}.${p}`).digest("base64url");
    expect(s).toBe(expected);
  });

  it("accepts a standard-base64 secret too and caps the ttl at 30 minutes", () => {
    const now = 1_700_000_000_000;
    const std = { ...key, signingSecret: Buffer.from("raw-signing-secret-bytes").toString("base64") };
    expect(mintPartnerJwt(std, now).token).toBe(mintPartnerJwt(key, now).token);
    const { token } = mintPartnerJwt(key, now, 99_999);
    expect(decode(token.split(".")[1]!).exp).toBe(1_700_000_000 + JWT_MAX_TTL_SECONDS);
  });
});

describe("signed connect state", () => {
  const data = { projectId: "11111111-1111-4111-8111-111111111111", userId: "u_1" };

  it("round-trips, carries a 30-minute expiry and an optional restart flag", () => {
    const now = 1_700_000_000_000;
    const token = signDoorDashState(data, SECRET, now);
    expect(verifyDoorDashState(token, SECRET, now)).toEqual({ ...data, exp: now / 1000 + 30 * 60 });
    const restart = signDoorDashState({ ...data, restart: true }, SECRET, now);
    expect(verifyDoorDashState(restart, SECRET, now)?.restart).toBe(true);
    expect(verifyDoorDashState(token, SECRET, now)?.restart).toBeUndefined();
  });

  it("rejects a tampered body, a wrong secret, an expired token and junk", () => {
    const now = 1_700_000_000_000;
    const token = signDoorDashState(data, SECRET, now);
    const [body, sig] = token.split(".");
    const other = Buffer.from(JSON.stringify({ ...data, userId: "u_2", exp: now / 1000 + 100 })).toString("base64url");
    expect(verifyDoorDashState(`${other}.${sig}`, SECRET, now)).toBeNull();
    expect(verifyDoorDashState(token, "nope", now)).toBeNull();
    expect(verifyDoorDashState(token, SECRET, now + 31 * 60_000)).toBeNull();
    expect(verifyDoorDashState(`${body}`, SECRET, now)).toBeNull();
    expect(verifyDoorDashState("", SECRET, now)).toBeNull();
    expect(verifyDoorDashState(token, "", now)).toBeNull();
  });

  it("does not verify an Uber- or Wix-signed state (different prefix)", () => {
    const body = Buffer.from(JSON.stringify({ ...data, exp: 4_000_000_000 })).toString("base64url");
    for (const prefix of ["uber", "wix"]) {
      const sig = createHmac("sha256", SECRET).update(`${prefix}:${body}`).digest("base64url");
      expect(verifyDoorDashState(`${body}.${sig}`, SECRET)).toBeNull();
    }
  });
});

describe("verifyDoorDashWebhookToken", () => {
  const headers = (authorization?: string) => new Headers(authorization ? { authorization } : {});

  it("accepts the portal token as a Bearer or bare Authorization header", () => {
    expect(verifyDoorDashWebhookToken(headers("Bearer tok_1"), "tok_1")).toBe(true);
    expect(verifyDoorDashWebhookToken(headers("bearer tok_1"), "tok_1")).toBe(true);
    expect(verifyDoorDashWebhookToken(headers("tok_1"), "tok_1")).toBe(true);
    expect(verifyDoorDashWebhookToken(headers("  tok_1 "), "tok_1")).toBe(true);
  });

  it("rejects a wrong, missing or empty token", () => {
    expect(verifyDoorDashWebhookToken(headers("Bearer tok_2"), "tok_1")).toBe(false);
    expect(verifyDoorDashWebhookToken(headers("Bearer tok_10"), "tok_1")).toBe(false);
    expect(verifyDoorDashWebhookToken(headers("Bearer "), "tok_1")).toBe(false);
    expect(verifyDoorDashWebhookToken(headers(), "tok_1")).toBe(false);
    expect(verifyDoorDashWebhookToken(headers("Bearer tok_1"), "")).toBe(false);
  });
});

describe("store candidates", () => {
  it("maps a candidate from either field spelling and treats missing eligibility as eligible", () => {
    expect(
      mapCandidate({
        doordash_store_uuid: " s-1 ",
        name: " Taco Place ",
        address: { street: "1 Main St", city: "Tampa", state: "FL", zip_code: "33601" },
        is_eligible_to_onboard: true,
        business: { id: 42, name: "Taco Co" },
      })
    ).toEqual({
      storeId: "s-1",
      name: "Taco Place",
      address: "1 Main St, Tampa, FL 33601",
      eligible: true,
      businessId: "42",
      businessName: "Taco Co",
    });
    expect(
      mapCandidate({ store_uuid: "s-2", store_name: "", address: "2 Side St, Tampa", business_id: "b1", is_eligible_to_onboard: false })
    ).toEqual({ storeId: "s-2", name: "DoorDash store", address: "2 Side St, Tampa", eligible: false, businessId: "b1", businessName: null });
    expect(mapCandidate({ doordash_store_uuid: "s-3" })?.eligible).toBe(true);
    expect(mapCandidate({ name: "no id" })).toBeNull();
  });

  it("flattens addresses and reads null for nothing", () => {
    expect(candidateAddress(null)).toBeNull();
    expect(candidateAddress("  ")).toBeNull();
    expect(candidateAddress({ address_line_1: "5 Ave", address_line_2: "Suite 2", city: "Miami" })).toBe("5 Ave, Suite 2, Miami");
    expect(candidateAddress({ state: "FL", postal_code: "33101" })).toBe("FL 33101");
    expect(candidateAddress({})).toBeNull();
  });
});

describe("onboarding status", () => {
  it("reads DoorDash's statuses case-insensitively and anything else as PENDING", () => {
    expect(onboardingStatus("menu_block")).toBe("MENU_BLOCK");
    expect(onboardingStatus("INTEGRATION_ACTIVATED")).toBe("INTEGRATION_ACTIVATED");
    expect(onboardingStatus("SOMETHING_NEW")).toBe("PENDING");
    expect(onboardingStatus(undefined)).toBe("PENDING");
  });

  it("maps one webhook payload to the store columns", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    expect(
      onboardingUpdate(
        {
          onboarding_id: "ob-1",
          status: "MENU_BLOCK",
          exclusion_code: " STORE_HOURS_NOT_POPULATED_FAILURE ",
          details: null,
          menus: [{ menu_uuid: "m1", menu_preview_link: null, menu_error: "Hours missing" }, { menu_uuid: "m2", menu_preview_link: "https://dd/preview" }],
        },
        now
      )
    ).toEqual({
      onboardingStatus: "MENU_BLOCK",
      exclusionCode: "STORE_HOURS_NOT_POPULATED_FAILURE",
      statusDetails: "Hours missing",
      menuPreviewUrl: "https://dd/preview",
      lastEventAt: now,
    });
    expect(onboardingUpdate({ status: "INTEGRATION_ACTIVATED", details: " done " }, now)).toEqual({
      onboardingStatus: "INTEGRATION_ACTIVATED",
      exclusionCode: null,
      statusDetails: "done",
      menuPreviewUrl: null,
      lastEventAt: now,
    });
  });

  it("knows which statuses can restart, which are final, and labels every one", () => {
    expect(canRestart("MENU_BLOCK")).toBe(true);
    expect(canRestart("ABANDONED")).toBe(true);
    expect(canRestart("MENU_REQUESTED")).toBe(false);
    expect(canRestart("PENDING")).toBe(false);
    expect(canRestart("INTEGRATION_ACTIVATED")).toBe(false);
    expect(isFinalStatus("INTEGRATION_ACTIVATED")).toBe(true);
    expect(isFinalStatus("ABANDONED")).toBe(true);
    expect(isFinalStatus("MENU_QUALIFIED")).toBe(false);
    for (const meta of Object.values(STATUS_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.text.length).toBeGreaterThan(0);
    }
  });
});

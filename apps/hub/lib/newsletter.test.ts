import { beforeEach, describe, expect, it, vi } from "vitest";

import { guessColumns, parseCsv, toImportRows } from "@/components/newsletter/csv";
import {
  buildFrom,
  chunk,
  CONTACT_IMPORT_CHUNK,
  normalizeDomain,
  parseFrom,
  rate,
} from "@workspace/trpc/lib/newsletter-shared";

// ── Server lib mocks (db + useSend) ──
const h = vi.hoisted(() => {
  const state = {
    row: null as Record<string, unknown> | null,
    claimed: [] as unknown[],
    updates: [] as Record<string, unknown>[],
    fetches: [] as { path: string; init: Record<string, unknown> }[],
    fetchImpl: (async () => ({})) as (path: string, init: Record<string, unknown>) => Promise<unknown>,
  };
  const db = {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => (state.row ? [state.row] : []) }) }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        state.updates.push(values);
        const where = () => {
          const p = Promise.resolve(undefined) as Promise<unknown> & { returning: () => Promise<unknown[]> };
          p.returning = async () => state.claimed;
          return p;
        };
        return { where };
      },
    }),
  };
  return { state, db };
});

vi.mock("@workspace/drizzle/index", () => ({ db: h.db }));
vi.mock("@workspace/email/usesend", () => {
  class UseSendError extends Error {
    constructor(
      readonly status: number,
      readonly code: string | undefined,
      message: string
    ) {
      super(message);
    }
  }
  return {
    UseSendError,
    usesendFetch: (path: string, init: Record<string, unknown>) => {
      h.state.fetches.push({ path, init });
      return h.state.fetchImpl(path, init);
    },
  };
});
vi.mock("@workspace/trpc/lib/usesend-provision", () => ({
  ensureProjectWorkspace: vi.fn(async () => ({ teamId: 9 })),
  // Every newsletter call goes through here: admin key + the project's team id.
  workspaceFetch: (teamId: number, path: string, init: Record<string, unknown> = {}) => {
    h.state.fetches.push({ path, init: { ...init, teamId } });
    return h.state.fetchImpl(path, init);
  },
}));

const lib = await import("@workspace/trpc/lib/newsletter");

beforeEach(() => {
  h.state.row = null;
  h.state.claimed = [];
  h.state.updates = [];
  h.state.fetches = [];
  h.state.fetchImpl = async () => ({});
});

describe("normalizeDomain", () => {
  it("accepts hostnames typed with protocol, path or caps", () => {
    expect(normalizeDomain("https://Mail.Acme.com/path?x=1")).toBe("mail.acme.com");
    expect(normalizeDomain("acme.co.uk.")).toBe("acme.co.uk");
  });
  it("rejects non-hostnames", () => {
    for (const bad of ["", "localhost", "acme", "a b.com", "-acme.com", "acme..com", "acme.com:8080", "x@acme.com"]) {
      expect(normalizeDomain(bad)).toBeNull();
    }
  });
});

describe("buildFrom (campaign sender stays on the project's domain)", () => {
  it("builds name + address on the given domain", () => {
    expect(buildFrom("Acme Bakery", "News", "mail.acme.com")).toBe("Acme Bakery <news@mail.acme.com>");
    expect(buildFrom("", "hello", "acme.com")).toBe("hello@acme.com");
  });
  it("refuses a local part that smuggles another domain or address", () => {
    for (const bad of ["a@evil.com", "a,b@evil.com", "a b", "", ".a", "a..b", "a<b>", "a\r\nBcc:x"]) {
      expect(() => buildFrom("x", bad, "acme.com")).toThrow();
    }
  });
  it("strips header-breaking characters from the display name", () => {
    expect(buildFrom('Evil" <x@evil.com>,\r\n', "news", "acme.com")).toBe("Evil x@evil.com <news@acme.com>");
  });
  it("parseFrom round-trips", () => {
    expect(parseFrom("Acme <news@acme.com>")).toEqual({ fromName: "Acme", localPart: "news", domain: "acme.com" });
    expect(parseFrom("news@acme.com")).toEqual({ fromName: "", localPart: "news", domain: "acme.com" });
  });
});

describe("chunk + rate", () => {
  it("splits a 2500-row import into 3 calls of ≤1000", () => {
    const rows = Array.from({ length: 2500 }, (_, i) => i);
    expect(chunk(rows, CONTACT_IMPORT_CHUNK).map((c) => c.length)).toEqual([1000, 1000, 500]);
  });
  it("rate is null with nothing delivered, never invented", () => {
    expect(rate(5, 0)).toBeNull();
    expect(rate(1, 3)).toBe(33.3);
  });
});

describe("CSV import", () => {
  it("parses quotes, escaped quotes, CRLF and BOM", () => {
    expect(parseCsv('﻿email,name\r\n"a@x.com","Doe, ""J"""\r\n\r\n')).toEqual([
      ["email", "name"],
      ["a@x.com", 'Doe, "J"'],
    ]);
  });
  it("guesses columns and keeps valid, de-duplicated rows", () => {
    const [header, ...body] = parseCsv("First Name,Last Name,E-mail\nAna,Lee,ANA@x.com\nBob,,bob@x\nAna2,,ana@x.com");
    const map = guessColumns(header!);
    expect(map).toEqual({ email: 2, firstName: 0, lastName: 1 });
    expect(toImportRows(body, map)).toEqual({
      rows: [{ email: "ana@x.com", firstName: "Ana", lastName: "Lee" }],
      skipped: 2,
    });
  });
});

describe("projectMail isolation", () => {
  // DELIBERATE CHANGE (2026-11-15, later): per-project API keys were dropped
  // (column usesend_api_key removed); calls use the admin key + the project's
  // team id from the database. "uses the project's own key" became this.
  it("calls useSend as the project's own team, from the database", async () => {
    h.state.row = { teamId: 11, domainId: null, contactBookId: null };
    const mail = await lib.projectMail("p-a");
    await lib.teamFetch(mail, "/api/v1/campaigns");
    expect(h.state.fetches[0]!.init.teamId).toBe(11);
  });

  // DELIBERATE CHANGE (2026-11-15, same day): projectMail no longer creates a
  // missing workspace on the fly; the Newsletter page shows "Set up" and
  // newsletter.setup creates it. The old "provisions the project's own
  // workspace" assertion was replaced by these two.
  it("a project without its own workspace is not set up (never uses the shared key)", async () => {
    h.state.row = { teamId: null, domainId: null, contactBookId: null };
    await expect(lib.projectMail("p-b")).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: lib.NOT_SET_UP,
    });
    expect(h.state.fetches).toHaveLength(0);
  });

  it("setup creates the project's own workspace", async () => {
    const { ensureProjectWorkspace } = await import("@workspace/trpc/lib/usesend-provision");
    await lib.setUpWorkspace("p-b", "acme/site");
    expect(ensureProjectWorkspace).toHaveBeenCalledWith({ projectId: "p-b", name: "acme/site" });
  });

  it("setup failure hides the cause from clients, shows it to admins", async () => {
    const { ensureProjectWorkspace } = await import("@workspace/trpc/lib/usesend-provision");
    vi.mocked(ensureProjectWorkspace).mockRejectedValueOnce(new Error("admin key refused"));
    await expect(lib.setUpWorkspace("p", "x/y")).rejects.not.toThrow(/admin key/);
    vi.mocked(ensureProjectWorkspace).mockRejectedValueOnce(new Error("admin key refused"));
    await expect(lib.setUpWorkspace("p", "x/y", true)).rejects.toThrow(/admin key refused/);
  });

  it("isProvisioned reflects the stored team id", async () => {
    h.state.row = { teamId: 3 };
    expect(await lib.isProvisioned("p")).toBe(true);
    h.state.row = { teamId: null };
    expect(await lib.isProvisioned("p")).toBe(false);
  });

  it("an unknown project is NOT_FOUND", async () => {
    await expect(lib.projectMail("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("one domain per project", () => {
  const mail = { projectId: "p", teamId: 1, domainId: null, contactBookId: null };

  it("a second create is refused before calling useSend", async () => {
    h.state.claimed = []; // conditional update matched nothing: a domain exists
    await expect(lib.createProjectDomain(mail, "acme.com", "us-west-2")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(h.state.fetches).toHaveLength(0);
  });

  it("the first create claims the slot, then stores the real id", async () => {
    h.state.claimed = [{ id: "p" }];
    h.state.fetchImpl = async () => ({ id: 42, name: "acme.com" });
    const domain = await lib.createProjectDomain(mail, "acme.com", "us-west-2");
    expect(domain.id).toBe(42);
    expect(h.state.updates).toEqual([{ usesendDomainId: lib.DOMAIN_CLAIMED }, { usesendDomainId: 42 }]);
  });

  it("a failed create releases the claim", async () => {
    h.state.claimed = [{ id: "p" }];
    h.state.fetchImpl = async () => {
      throw new Error("ses down");
    };
    await expect(lib.createProjectDomain(mail, "acme.com", "us-west-2")).rejects.toThrow();
    expect(h.state.updates.at(-1)).toEqual({ usesendDomainId: null });
  });

  it("an in-flight claim is not treated as a domain", async () => {
    expect(await lib.projectDomain({ ...mail, domainId: lib.DOMAIN_CLAIMED })).toBeNull();
    expect(h.state.fetches).toHaveLength(0);
  });

  it("sending needs a verified domain", async () => {
    h.state.fetchImpl = async () => ({ id: 5, name: "acme.com", status: "PENDING", dnsRecords: [] });
    await expect(lib.verifiedDomain({ ...mail, domainId: 5 })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});

// Regression (2026-11-15): useSend creates contact books with double opt-in
// ON, so importing a list emailed every contact a confirmation request.
describe("subscriber list creation", () => {
  it("creates the project's list with double opt-in off", async () => {
    h.state.claimed = [{ id: "cb_1" }];
    h.state.fetchImpl = async () => ({ id: "cb_1" });
    await lib.ensureContactBook({ projectId: "p", teamId: 1, domainId: null, contactBookId: null });
    const create = h.state.fetches.find((f) => f.path === "/api/v1/contactBooks")!;
    expect(create.init.method).toBe("POST");
    expect(create.init.body).toEqual({ name: "Subscribers", doubleOptInEnabled: false });
  });
});

// Regression (2026-11-15): imported lists (General, MIS…) were invisible in
// the hub, which only ever used the project's own "Subscribers" list.
describe("resolveList", () => {
  const mail = { projectId: "p", teamId: 15, domainId: null, contactBookId: "cb_default" };
  it("uses the chosen list as-is (scoped to the project's team by useSend)", async () => {
    expect(await lib.resolveList(mail, "cb_general")).toBe("cb_general");
    expect(h.state.fetches).toHaveLength(0);
  });
  it("falls back to the project's default list", async () => {
    expect(await lib.resolveList(mail)).toBe("cb_default");
  });
});

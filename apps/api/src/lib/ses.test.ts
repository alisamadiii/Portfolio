import { describe, expect, it } from "vitest";

import { buildRawEmail, bytesToBase64 } from "./ses.js";

const b64decode = (s: string): string =>
  new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/\r\n/g, "")), (c) => c.charCodeAt(0))
  );

describe("bytesToBase64", () => {
  it("round-trips a buffer larger than one chunk (>32 KB)", () => {
    const bytes = new Uint8Array(0x8000 + 123);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const decoded = Uint8Array.from(atob(bytesToBase64(bytes)), (c) =>
      c.charCodeAt(0)
    );
    expect(decoded).toEqual(bytes);
  });
});

describe("buildRawEmail", () => {
  const base = {
    from: "noreply@acme.com",
    to: ["a@example.com"],
    subject: "Héllo 👋 — invoice",
    html: "<p>Hí 👋</p>",
    text: "Hí 👋",
    attachments: [
      { filename: "a.txt", content: "aGVsbG8=", contentType: "text/plain" },
    ],
  };

  it("encodes a UTF-8/emoji subject and body without throwing (btoa trap)", () => {
    const mime = buildRawEmail(base);
    // Subject is an RFC 2047 base64 word — decode it back.
    const subjectWord = /Subject: =\?UTF-8\?B\?(.+?)\?=/.exec(mime)?.[1] ?? "";
    expect(b64decode(subjectWord)).toBe(base.subject);
    expect(mime).toContain('Content-Type: multipart/mixed; boundary=');
    expect(mime).toContain("multipart/alternative");
  });

  it("includes the html/text parts base64-encoded", () => {
    const mime = buildRawEmail(base);
    expect(mime).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(mime).toContain(bytesToBase64(new TextEncoder().encode(base.html)));
  });

  it("emits an attachment part with disposition and content", () => {
    const mime = buildRawEmail(base);
    expect(mime).toContain(
      'Content-Disposition: attachment; filename="a.txt"'
    );
    expect(mime).toContain('Content-Type: text/plain; name="a.txt"');
    expect(mime).toContain("aGVsbG8=");
  });

  it("defaults contentType to application/octet-stream", () => {
    const mime = buildRawEmail({
      ...base,
      attachments: [{ filename: "x.bin", content: "AAAA" }],
    });
    expect(mime).toContain(
      'Content-Type: application/octet-stream; name="x.bin"'
    );
  });
});

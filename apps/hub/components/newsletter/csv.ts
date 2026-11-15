// Minimal RFC 4180 CSV reader for subscriber imports (quoted fields, escaped
// quotes, CRLF). Runs in the browser; the server re-validates every row.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export type ColumnMap = { email: number; firstName: number; lastName: number };

/** Guesses the email / first / last name columns from a header row. -1 = none. */
export function guessColumns(header: string[]): ColumnMap {
  const find = (...names: RegExp[]) =>
    header.findIndex((h) => names.some((n) => n.test(h.trim().toLowerCase())));
  return {
    email: find(/^e-?mail/, /email/),
    firstName: find(/^first/, /^given/, /^name$/),
    lastName: find(/^last/, /^surname/, /^family/),
  };
}

export type ImportRow = { email: string; firstName?: string; lastName?: string };

/** Valid, de-duplicated rows plus how many were skipped. */
export function toImportRows(rows: string[][], map: ColumnMap): { rows: ImportRow[]; skipped: number } {
  const seen = new Set<string>();
  const out: ImportRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const email = (r[map.email] ?? "").trim().toLowerCase();
    if (!EMAIL.test(email) || seen.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);
    const firstName = map.firstName >= 0 ? (r[map.firstName] ?? "").trim().slice(0, 100) : "";
    const lastName = map.lastName >= 0 ? (r[map.lastName] ?? "").trim().slice(0, 100) : "";
    out.push({ email, ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}) });
  }
  return { rows: out, skipped };
}

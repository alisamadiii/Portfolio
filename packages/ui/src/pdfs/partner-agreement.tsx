/**
 * Ali Samadii LLC: signed Partner Agreement
 *
 * Rendered once, when a partner applies, and stored in the private R2 bucket
 * as the record of what they signed. The text MUST match
 * apps/partner-program/src/apply/AgreementText.tsx for the same
 * `agreementVersion`: change both together and bump the version.
 */
import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { AGENCY_LOGO_PNG } from "./shared/agency-logo";

// Keep in sync with apps/partner-program/src/config.ts `program`.
export const PARTNER_PROGRAM = {
  company: "Ali Samadii LLC",
  email: "a@alisamadii.com",
} as const;

export interface PartnerAgreementData {
  fullName: string;
  email: string;
  // Collected from version 2026-11.2 on.
  address?: string | null;
  payoutMethod?: string | null;
  signature: string;
  initials: string;
  signedAt: Date;
  version: string;
  ip?: string | null;
}

const p = PARTNER_PROGRAM;

const KEY_TERMS: [string, string][] = [
  ["What you do", "Introduce local businesses that need a website. We handle the conversation, design and build. (Section 1)"],
  ["What you earn", "20% of the business's first website payment, after payment processing fees. One time per business. (Section 3)"],
  ["Monthly subscription", "$0 to you. You earn only from the first website payment. (Section 3)"],
  ["When you're paid", "Within 14 days after the business pays, by Zelle or Cash App. (Section 3)"],
  ["Refunds", "If the business is refunded before your payout is sent, no payout is owed. Once sent, it's yours to keep. (Section 3)"],
  ["Cost to join", "Free. (Section 1)"],
  ["Ending", "Either side can stop anytime. Payouts you already earned are still paid. (Section 7)"],
];

const SECTIONS: { title: string; clauses: string[] }[] = [
  {
    title: "1. The program",
    clauses: [
      "1.1. Agency runs a referral program for people who know local business owners. Partner introduces businesses that need a website. Agency handles the conversation, pricing, design and build. Partner does not need to sell or do anything technical.",
      "1.2. Partner must be at least eighteen (18) years old and approved by Agency. Agency reviews every application by hand and emails approved partners a personal referral code. Joining is free.",
    ],
  },
  {
    title: "2. Referrals",
    clauses: [
      "2.1. A \"Qualified Referral\" is a business that: (a) uses Partner's referral code or names Partner when it signs up; (b) was not already in contact with Agency before Partner's introduction; and (c) pays its first website payment.",
      "2.2. If more than one partner refers the same business, the first referral Agency receives counts. Agency's records decide.",
      "2.3. Agency may decline to work with any business. No payout is owed for a business that does not sign up or does not pay.",
    ],
  },
  {
    title: "3. Payout",
    clauses: [
      "3.1. For each Qualified Referral, Partner earns twenty percent (20%) of the Net First Payment, unless Company agrees a different rate with Partner in writing. \"Net First Payment\" means the business's first website payment (the one-time setup fee only, not the monthly plan or sales tax), minus every fee the payment provider charges on it, such as Stripe processing fees. If the business pays with no provider fees, such as by check, the commission is calculated on the full setup fee.",
      "3.2. Example: a business pays a $1,000 setup fee by card. The Stripe fee on it is $29.30, so the Net First Payment is $970.70, and Partner earns $194.14 at the 20% rate. Actual fees vary by payment method and card.",
      "3.3. The payout is one time per business. Partner earns nothing from the business's monthly plan, renewals, add-ons or later projects.",
      "3.4. Agency sends the payout within fourteen (14) days after the business's payment is received and cleared, by Zelle or Cash App to the details Partner provides. Agency shows Partner the payment amount and fees on request.",
      "3.5. If the business receives a refund before the payout is sent, no payout is owed. Once a payout is sent, Partner keeps it.",
    ],
  },
  {
    title: "4. Taxes",
    clauses: [
      "4.1. Partner is responsible for its own taxes on payouts. Partner gives Agency a completed Form W-9 before the first payout, and Agency may issue a Form 1099 as required by law.",
    ],
  },
  {
    title: "5. How Partner promotes Agency",
    clauses: [
      "5.1. Partner is honest about the referral relationship and about Agency's services. Partner does not promise prices, timelines or results beyond what Agency has published.",
      "5.2. Partner does not send spam or unsolicited bulk messages, and does not run paid ads using Agency's name or brand without Agency's written approval.",
      "5.3. Partner cannot sign agreements, accept payments or make commitments for Agency.",
      "5.4. If Partner breaks this Section, Agency may end this Agreement right away, and no payout is owed for referrals gained that way.",
    ],
  },
  {
    title: "6. Relationship",
    clauses: [
      "6.1. Partner is an independent contractor, not an employee, agent or business partner of Agency. Partner pays its own expenses.",
    ],
  },
  {
    title: "7. Ending the agreement",
    clauses: [
      "7.1. Either Party may end this Agreement at any time by email.",
      "7.2. Agency still pays the payout for any business Partner referred before the end date that pays within sixty (60) days after it.",
    ],
  },
  {
    title: "8. Changes",
    clauses: [
      "8.1. Agency may change the payout rate or these terms with thirty (30) days' notice by email. Changes do not affect businesses Partner referred before the change takes effect.",
    ],
  },
  {
    title: "9. Confidentiality",
    clauses: [
      "9.1. Partner keeps non-public information about Agency and its clients, such as prices, contacts and business details, confidential.",
    ],
  },
  {
    title: "10. Liability and disputes",
    clauses: [
      "10.1. Agency's total liability under this Agreement is limited to payouts earned and not yet paid.",
      "10.2. Florida law governs this Agreement. The Parties first try for thirty (30) days to resolve any dispute directly. After that, either Party may bring a claim in small claims court in Duval County, Florida.",
    ],
  },
  {
    title: "11. General",
    clauses: [
      "11.1. Notices are sent by email to the addresses below. This Agreement may be signed electronically. It is the whole agreement between the Parties about the program. If any part is unenforceable, the rest still applies.",
    ],
  },
];

const ink = "#221F1C";
const dim = "#6B6560";
const line = "#E7E3DE";
const coral = "#FC8464";

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: ink,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: line,
    marginBottom: 24,
  },
  logo: { width: 36, height: 36 },
  company: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  small: { fontSize: 9, color: dim },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, lineHeight: 1.2, marginBottom: 6 },
  h: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 12, marginBottom: 3 },
  sig: {
    marginTop: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: line,
    borderLeftWidth: 3,
    borderLeftColor: coral,
    borderRadius: 6,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 110, color: dim },
  p: { marginTop: 4 },
  table: { marginTop: 6, borderTopWidth: 1, borderLeftWidth: 1, borderColor: line },
  tr: { flexDirection: "row" },
  td: { flex: 1, padding: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: line },
  th: { fontFamily: "Helvetica-Bold" },
  sigName: { fontFamily: "Helvetica-Oblique", fontSize: 16, marginBottom: 8 },
  footer: { position: "absolute", bottom: 28, left: 56, fontSize: 8, color: dim },
});

function Table({ rows, head, firstWidth }: { rows: string[][]; head?: string[]; firstWidth: number }) {
  const cell = (i: number) => (i === 0 ? [s.td, s.th, { flexGrow: 0, flexShrink: 0, flexBasis: firstWidth, width: firstWidth }] : [s.td]);
  return (
    <View style={s.table}>
      {head ? (
        <View style={[s.tr, { backgroundColor: "#F7F6F4" }]} wrap={false}>
          {head.map((h, i) => (
            <Text key={i} style={[...cell(i), s.th]}>{h}</Text>
          ))}
        </View>
      ) : null}
      {rows.map((r) => (
        <View key={r[0]} style={s.tr} wrap={false}>
          {r.map((c, i) => (
            <Text key={i} style={cell(i)}>{c}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });

const fmtDate = (d: Date) =>
  d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });

export function PartnerAgreementPdf({ data }: { data: PartnerAgreementData }) {
  const day = fmtDay(data.signedAt);
  const address = data.address || "[Partner address]";
  const sigRows = [
    ["Company / Name", p.company, data.fullName],
    ["Signature", "", data.signature],
    ["Name", "Ali Samadi", data.fullName],
    ["Title", "Managing Member", "Partner"],
    ["Date", day, day],
    ["Notices to", p.email, data.email],
    ["Payout method", "", data.payoutMethod || "[Zelle / Cash App: handle or phone]"],
  ];
  return (
    <Document
      title="Partner Agreement"
      author={p.company}
      subject={`Partner Agreement signed by ${data.fullName}`}
    >
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={AGENCY_LOGO_PNG} style={s.logo} />
          <View>
            <Text style={s.company}>{p.company}</Text>
            <Text style={s.small}>
              566 Kit St, Jacksonville, FL · a@alisamadii.com · (971) 382-8969
            </Text>
          </View>
        </View>

        <Text style={s.title}>Partner Agreement</Text>
        <Text style={s.small}>Version {data.version}</Text>

        <Text style={{ marginTop: 12 }}>
          {`This Partner Agreement (the "Agreement") is made on ${day} between ${p.company}, a Florida limited liability company doing business as Ali Samadi Agency (the "Agency"), and ${data.fullName} at ${address} (the "Partner"). Agency and Partner are each a "Party".`}
        </Text>

        <View>
          <Text style={s.h}>Key terms at a glance</Text>
          <Text>A plain-language summary. If it differs from the numbered sections, the numbered sections control.</Text>
          <Table head={["Topic", "In short"]} rows={KEY_TERMS} firstWidth={130} />
        </View>

        {SECTIONS.map((sec) => (
          <View key={sec.title}>
            <Text style={s.h} minPresenceAhead={40}>{sec.title}</Text>
            {sec.clauses.map((c) => (
              <Text key={c} style={s.p}>{c}</Text>
            ))}
          </View>
        ))}

        <View wrap={false}>
          <Text style={s.h}>Signatures</Text>
          <Table head={["", "Agency", "Partner"]} rows={sigRows} firstWidth={110} />
        </View>

        <View style={s.sig} wrap={false}>
          <Text style={[s.h, { marginTop: 0 }]}>Signed electronically</Text>
          <Text style={s.sigName}>{data.signature}</Text>
          <View style={s.row}>
            <Text style={s.label}>Full name</Text>
            <Text>{data.fullName}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Email</Text>
            <Text>{data.email}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Initials</Text>
            <Text>{data.initials}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Signed at</Text>
            <Text>{fmtDate(data.signedAt)}</Text>
          </View>
          {data.ip ? (
            <View style={s.row}>
              <Text style={s.label}>IP address</Text>
              <Text>{data.ip}</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.footer} fixed>
          {p.company} Partner Agreement
        </Text>
      </Page>
    </Document>
  );
}

export const renderPartnerAgreement = (data: PartnerAgreementData) =>
  renderToBuffer(<PartnerAgreementPdf data={data} />);

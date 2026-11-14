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
  payoutRate: 0.4,
  mainPlanPrice: 699,
  payoutDays: "14 days",
  paymentMethod: "Zelle or Cash App",
  refundPolicy: "If the client gets a refund before your payout is sent, no payout is owed. Once a payout is sent, it's yours to keep.",
  governingLaw: "This agreement is governed by the laws of the State of Florida.",
} as const;

export interface PartnerAgreementData {
  fullName: string;
  email: string;
  signature: string;
  initials: string;
  signedAt: Date;
  version: string;
  ip?: string | null;
}

const money = (n: number) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

const p = PARTNER_PROGRAM;
const examplePayout = Math.round(p.mainPlanPrice * p.payoutRate * 100) / 100;

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. The program",
    body: `${p.company} ("we", "us") runs a referral program. As a partner ("you"), you introduce local businesses that need a website to us.`,
  },
  {
    title: "2. Your referral code",
    body: "If your application is approved, we email you a unique referral code. A referral counts when a business uses your code or names you when it signs up, wasn't already talking to us, and pays for a website.",
  },
  {
    title: "3. Your payout",
    body: `You earn 40% of the referred business's first website payment. The amount depends on the plan or price the business pays. For example, a ${money(p.mainPlanPrice)} website pays you ${money(examplePayout)}. You don't earn anything from the business's monthly subscription or any later payments.`,
  },
  {
    title: "4. When you're paid",
    body: `We send your payout only after the business has paid, within ${p.payoutDays}, by ${p.paymentMethod}. If a business never pays, no payout is owed.`,
  },
  { title: "5. Refunds", body: p.refundPolicy },
  {
    title: "6. No cost, no obligation",
    body: "Joining is free. You're not required to refer anyone, and you don't need to sell or do anything technical. We handle the conversation, design and build.",
  },
  {
    title: "7. Our relationship",
    body: `You're an independent partner, not an employee or agent of ${p.company}. This is not an employment offer. You can't make promises, set prices or sign agreements on our behalf.`,
  },
  {
    title: "8. Honest promotion",
    body: "Describe our services accurately. Don't promise results or prices we haven't confirmed, and don't send spam or contact businesses that ask you not to.",
  },
  {
    title: "9. Taxes",
    body: "You're responsible for any taxes on your payouts.",
  },
  {
    title: "10. Ending the partnership",
    body: "Either of us can end this agreement at any time by email. Payouts for businesses that paid before the end date will still be sent.",
  },
  {
    title: "11. Changes",
    body: `We may update these terms. We'll email you before any change takes effect. ${p.governingLaw}`,
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
  sigName: { fontFamily: "Helvetica-Oblique", fontSize: 16, marginBottom: 8 },
  footer: { position: "absolute", bottom: 28, left: 56, fontSize: 8, color: dim },
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

        {SECTIONS.map((sec) => (
          <View key={sec.title} wrap={false}>
            <Text style={s.h}>{sec.title}</Text>
            <Text>{sec.body}</Text>
          </View>
        ))}

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

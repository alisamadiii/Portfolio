import { contact, program } from '../config';
import { todayLabel, type FormValues } from './form';

/**
 * The Partner Agreement. The signed PDF is rendered from
 * packages/ui/src/pdfs/partner-agreement.tsx: change both together and bump
 * program.agreementVersion in config.ts whenever the text changes.
 */

const KEY_TERMS: [string, string][] = [
  ['What you do', 'Introduce local businesses that need a website. We handle the conversation, design and build. (Section 1)'],
  ['What you earn', '20% of the setup fee of every website a business you referred buys from us, after payment processing fees. (Section 3)'],
  ['Monthly subscription', '$0 to you. You earn only from website setup fees. (Section 3)'],
  ["When you're paid", 'Within 14 days after the business pays, by bank transfer (ACH) to the account you add through Mercury, our bank. (Section 3)'],
  ["Your bank details", "Added on Mercury's secure form, W-9 included. Our systems don't store them; we can view them in Mercury only to pay you. (Section 3)"],
  ['Refunds', "If the business is refunded before your payout is sent, no payout is owed. Once sent, it's yours to keep. (Section 3)"],
  ['Cost to join', 'Free. (Section 1)'],
  ['Ending', 'Either side can stop anytime. Payouts you already earned are still paid. (Section 7)'],
];

const SECTIONS: { title: string; clauses: string[] }[] = [
  {
    title: '1. The program',
    clauses: [
      '1.1. Agency runs a referral program for people who know local business owners. Partner introduces businesses that need a website. Agency handles the conversation, pricing, design and build. Partner does not need to sell or do anything technical.',
      '1.2. Partner must be at least eighteen (18) years old and approved by Agency. Agency reviews every application by hand and emails approved partners a personal referral code. Joining is free.',
    ],
  },
  {
    title: '2. Referrals',
    clauses: [
      "2.1. A \"Qualified Referral\" is a business that: (a) uses Partner's referral code or names Partner when it signs up; (b) was not already in contact with Agency before Partner's introduction; and (c) pays its first website payment.",
      "2.2. If more than one partner refers the same business, the first referral Agency receives counts. Agency's records decide.",
      '2.3. Agency may decline to work with any business. No payout is owed for a business that does not sign up or does not pay.',
      "2.4. Each website project that a Qualified Referral buys from Agency is a \"Referred Project\": the first website and any later website for the same business, or for another location or brand under the same owner, as long as this Agreement is in force when that website's first payment is received.",
    ],
  },
  {
    title: '3. Payout',
    clauses: [
      "3.1. For each Referred Project, Partner earns twenty percent (20%) of its Net First Payment, unless Company agrees a different rate with Partner in writing. \"Net First Payment\" means that website's one-time setup fee (not the monthly plan, hosting, add-ons or sales tax), minus every fee the payment provider charges on it, such as Stripe processing fees. If the business pays with no provider fees, such as by check, the commission is calculated on the full setup fee.",
      '3.2. Example: a business pays a $1,000 setup fee by card. The Stripe fee on it is $29.30, so the Net First Payment is $970.70, and Partner earns $194.14 at the 20% rate. Actual fees vary by payment method and card.',
      '3.3. Partner earns nothing from monthly plans, renewals, hosting, add-ons, maintenance or any work that is not a new website project. Later websites for the same business count under Section 2.4.',
      "3.4. Agency sends the payout within fourteen (14) days after the website's first payment is received and cleared, by bank transfer (ACH) to the bank account Partner added through Mercury under Section 3.6. Agency shows Partner the payment amount and fees on request.",
      '3.5. If the business receives a refund before the payout is sent, no payout is owed. Once a payout is sent, Partner keeps it.',
      "3.6. Bank account through Mercury. Agency pays from its business bank, Mercury. After approval, Agency sends Partner a Mercury recipient invite by email, and Partner adds a bank account on Mercury's own form, together with any tax form Mercury requests. Partner does not need a Mercury account; Mercury's terms and privacy policy govern that form. Agency's website and database do not store Partner's account or routing numbers. Agency can view the details Partner entered inside Mercury and uses them only to send payouts. The fourteen (14) day period in Section 3.4 starts once a bank account is on file. If the invite expires, Agency sends a new one on request. Agency is not required to pay by any other method.",
    ],
  },
  {
    title: '4. Taxes',
    clauses: [
      "4.1. Partner is responsible for its own taxes on payouts. Partner provides a completed Form W-9 through Mercury's form, or to Agency on request, before the first payout, and Agency may issue a Form 1099 as required by law.",
    ],
  },
  {
    title: '5. How Partner promotes Agency',
    clauses: [
      "5.1. Partner is honest about the referral relationship and about Agency's services. Partner does not promise prices, timelines or results beyond what Agency has published.",
      "5.2. Partner does not send spam or unsolicited bulk messages, and does not run paid ads using Agency's name or brand without Agency's written approval.",
      '5.3. Partner cannot sign agreements, accept payments or make commitments for Agency.',
      '5.4. If Partner breaks this Section, Agency may end this Agreement right away, and no payout is owed for referrals gained that way.',
    ],
  },
  {
    title: '6. Relationship',
    clauses: ['6.1. Partner is an independent contractor, not an employee, agent or business partner of Agency. Partner pays its own expenses.'],
  },
  {
    title: '7. Ending the agreement',
    clauses: [
      '7.1. Either Party may end this Agreement at any time by email.',
      "7.2. Agency still pays for any Referred Project of a business Partner referred before the end date, if that website's first payment is received within sixty (60) days after it.",
    ],
  },
  {
    title: '8. Changes',
    clauses: [
      "8.1. Agency may change the payout rate or these terms with thirty (30) days' notice by email. Changes do not affect businesses Partner referred before the change takes effect.",
    ],
  },
  {
    title: '9. Confidentiality',
    clauses: [
      '9.1. Partner keeps non-public information about Agency and its clients, such as prices, contacts and business details, confidential.',
    ],
  },
  {
    title: '10. Liability and disputes',
    clauses: [
      "10.1. Agency's total liability under this Agreement is limited to payouts earned and not yet paid.",
      '10.2. Florida law governs this Agreement. The Parties first try for thirty (30) days to resolve any dispute directly. After that, either Party may bring a claim in small claims court in Duval County, Florida.',
    ],
  },
  {
    title: '11. General',
    clauses: [
      '11.1. Notices are sent by email to the addresses below. This Agreement may be signed electronically. It is the whole agreement between the Parties about the program. If any part is unenforceable, the rest still applies.',
    ],
  },
];

export function AgreementText({ values }: { values: FormValues }) {
  const name = values.fullName.trim() || '[Partner full name]';
  const address = values.address.trim() || '[Partner address]';
  const date = todayLabel();

  const sigRows: [string, string, string][] = [
    ['Company / Name', program.company, name],
    ['Signature', '', values.signature.trim() || '[Your signature]'],
    ['Name', 'Ali Samadi', name],
    ['Title', 'Managing Member', 'Partner'],
    ['Date', date, date],
    ['Notices to', contact.email, values.email],
    ['Payout method', '', 'Bank transfer (ACH) via Mercury'],
  ];

  return (
    <>
      <p style={{ marginTop: 18 }}>
        This Partner Agreement (the "Agreement") is made on {date} between {program.company}, a Florida limited
        liability company doing business as Ali Samadi Agency (the "Agency"), and {name} at {address} (the
        "Partner"). Agency and Partner are each a "Party".
      </p>

      <h4>Key terms at a glance</h4>
      <p>A plain-language summary. If it differs from the numbered sections, the numbered sections control.</p>
      <table className="agreement__table">
        <thead>
          <tr><th scope="col">Topic</th><th scope="col">In short</th></tr>
        </thead>
        <tbody>
          {KEY_TERMS.map(([topic, short]) => (
            <tr key={topic}><th scope="row">{topic}</th><td>{short}</td></tr>
          ))}
        </tbody>
      </table>

      {SECTIONS.map((sec) => (
        <div key={sec.title}>
          <h4>{sec.title}</h4>
          {sec.clauses.map((c) => <p key={c} style={{ marginTop: 6 }}>{c}</p>)}
        </div>
      ))}

      <h4>Signatures</h4>
      <table className="agreement__table">
        <thead>
          <tr><th scope="col"><span className="sr-only">Field</span></th><th scope="col">Agency</th><th scope="col">Partner</th></tr>
        </thead>
        <tbody>
          {sigRows.map(([label, agency, partner]) => (
            <tr key={label}><th scope="row">{label}</th><td>{agency}</td><td>{partner}</td></tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 22, fontWeight: 600, color: 'var(--ink)' }}>End of agreement.</p>
    </>
  );
}

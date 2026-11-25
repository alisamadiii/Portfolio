import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  button,
  buttonSection,
  codeBox,
  container,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  mutedText,
  paragraph,
  strong,
  subheading,
  urlBox,
} from "./components/shared";

// To the partner: approved, with the referral code Ali picked.

export interface PartnerApprovedEmailProps {
  fullName: string;
  code: string;
  /** The partner's own Mercury invite link (add bank account). Omitted once their bank is on file. */
  mercuryUrl?: string | null;
}

const PARTNER_PAGE = "https://app.alisamadii.com/partner";
// White wordmark on Mercury's dark (#11101a), 2x, on the media bucket.
const MERCURY_WORDMARK = "https://cdn.alisamadii.com/third-party-services/mercury-wordmark-dark.png";

export default function PartnerApprovedEmail({ fullName, code, mercuryUrl }: PartnerApprovedEmailProps) {
  const first = fullName.trim().split(/\s+/)[0] ?? fullName;
  const site = `https://www.alisamadii.com/?ref=${encodeURIComponent(code)}`;
  return (
    <Html>
      <Head />
      <Preview>{`You're approved. Your referral code is ${code}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Welcome to the Partner Program</Heading>
          <Text style={subheading}>You&apos;re approved, {first}</Text>

          <Text style={paragraph}>Here is your referral code:</Text>

          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={paragraph}>
            Give it to any business that needs a website. They can enter it on our quote form,
            mention it when we talk, or share your link:
          </Text>

          <Text style={urlBox}>{site}</Text>

          <Text style={{ ...paragraph, margin: "24px 0 20px" }}>
            When a business you referred pays for its website, you earn{" "}
            <span style={strong}>your share of that first payment</span>, after payment processing fees. We&apos;ll email you when that
            happens and when your payout is sent.
          </Text>

          {mercuryUrl ? (
            // Mercury-themed card: this step happens on Mercury's site, not ours.
            <Section style={mercuryCard}>
              <Img src={MERCURY_WORDMARK} alt="Mercury" width={104} height={24} style={mercuryLogo} />
              <Text style={mercuryTitle}>One thing to do now: add your bank account</Text>
              <Text style={mercuryText}>
                Mercury, our bank, keeps the account you want your payouts sent to. We never see your account
                number.
              </Text>
              <Section style={{ margin: "20px 0 14px" }}>
                <Button href={mercuryUrl} style={mercuryButton}>
                  Add your bank account
                </Button>
              </Section>
              <Text style={mercuryMuted}>
                No Mercury account needed: on the first page click <span style={mercuryStrong}>Skip</span> and go
                straight to the bank form. Mercury also emailed you this link. It expires in 30 days.
              </Text>
            </Section>
          ) : (
            <Text style={{ ...paragraph, margin: "0 0 20px" }}>
              Payouts go by bank transfer to the account you add through Mercury, our bank. We never see your
              account number.
            </Text>
          )}

          <Section style={buttonSection}>
            <Button href={PARTNER_PAGE} style={button}>
              Open your partner page
            </Button>
          </Section>

          <Text style={mutedText}>
            Your code, referrals, payouts and signed agreement are all there. Questions? Just reply
            to this email.
          </Text>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>Ali Samadi</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

PartnerApprovedEmail.PreviewProps = {
  fullName: "Dana Brooks",
  code: "DANA",
  mercuryUrl: "https://app.mercury.com/payments/recipients/request/example",
} satisfies PartnerApprovedEmailProps;

// Mercury palette (mercury.com tokens): purple-base dark, #4d68eb accent, pill button.
const mercuryCard: React.CSSProperties = {
  backgroundColor: "#11101a",
  border: "1px solid #272735",
  borderRadius: "14px",
  margin: "0 0 24px",
  padding: "24px",
};

const mercuryLogo: React.CSSProperties = {
  display: "block",
  margin: "0 0 18px",
};

const mercuryTitle: React.CSSProperties = {
  color: "#fbfcfd",
  fontSize: "18px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: "26px",
  margin: "0 0 8px",
};

const mercuryText: React.CSSProperties = {
  color: "#c3c0df",
  fontSize: "15px",
  lineHeight: "24px",
  margin: 0,
};

const mercuryButton: React.CSSProperties = {
  backgroundColor: "#4d68eb",
  borderRadius: "999px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 500,
  padding: "13px 22px",
  textDecoration: "none",
};

const mercuryMuted: React.CSSProperties = {
  color: "#9d9da8",
  fontSize: "13px",
  lineHeight: "20px",
  margin: 0,
};

const mercuryStrong: React.CSSProperties = {
  color: "#fbfcfd",
  fontWeight: 600,
};

const codeText: React.CSSProperties = {
  color: "#111111",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "28px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: 0,
};

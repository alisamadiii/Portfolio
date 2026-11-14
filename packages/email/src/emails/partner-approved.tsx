import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
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
  textLink,
  urlBox,
} from "./components/shared";

// To the partner: approved, with the referral code Ali picked.

export interface PartnerApprovedEmailProps {
  fullName: string;
  code: string;
  pdfUrl: string;
}

export default function PartnerApprovedEmail({ fullName, code, pdfUrl }: PartnerApprovedEmailProps) {
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
            <span style={strong}>40% of that first payment</span>. We&apos;ll email you when that
            happens and when your payout is sent.
          </Text>

          <Text style={mutedText}>
            Your signed agreement:{" "}
            <Link href={pdfUrl} style={textLink}>
              download PDF
            </Link>
            . Questions? Just reply to this email.
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
  pdfUrl: "https://api.alisamadii.com/api/partners/agreement/example-token",
} satisfies PartnerApprovedEmailProps;

const codeText: React.CSSProperties = {
  color: "#111111",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "28px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: 0,
};

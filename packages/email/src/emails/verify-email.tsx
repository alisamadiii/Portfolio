import {
  Body,
  Container,
  Head,
  Heading,
  Html,
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
  label,
  main,
  mutedText,
  paragraph,
  subheading,
} from "./components/shared";

interface VerifyEmailProps {
  verificationCode?: string;
}

export default function VerifyEmail({ verificationCode }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Ali Samadii Client Hub verification code</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Verify your email address</Heading>
          <Text style={subheading}>Finish setting up your Client Hub account</Text>

          <Text style={paragraph}>
            Welcome to Ali Samadii Client Hub. Enter the code below to verify
            your email address.
          </Text>

          <Section style={codeBox}>
            <Text style={{ ...label, margin: "0 0 8px" }}>
              Verification Code
            </Text>
            <Text style={code}>{verificationCode}</Text>
            <Text style={{ ...mutedText, margin: 0 }}>
              Valid for 10 minutes
            </Text>
          </Section>

          <Text style={mutedText}>
            If you didn&apos;t create an account, you can ignore this email.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

VerifyEmail.PreviewProps = {
  verificationCode: "596853",
} satisfies VerifyEmailProps;

const code: React.CSSProperties = {
  color: "#111111",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "36px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  margin: "0 0 8px",
};

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
      <Preview>Dream Website Email Verification</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Verify your email address</Heading>
          <Text style={subheading}>Complete your account setup</Text>

          <Text style={paragraph}>
            Welcome to Dream Website! To complete your account setup, please
            use the verification code below.
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
            If you didn&apos;t create an account, you can safely ignore this
            email.
          </Text>

          <Text style={{ ...mutedText, margin: 0 }}>
            For your security, we will never ask you to verify your password,
            credit card, or banking information via email.
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

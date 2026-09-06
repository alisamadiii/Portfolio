import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  button,
  buttonSection,
  container,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  mutedText,
  paragraph,
  subheading,
  urlBox,
} from "./components/shared";

interface ResetPasswordProps {
  resetPasswordLink?: string;
}

export default function ResetPassword({
  resetPasswordLink,
}: ResetPasswordProps) {
  return (
    <Html>
      <Head />
      <Preview>Dream Website Password Reset</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Reset your password</Heading>
          <Text style={subheading}>Create a new password for your account</Text>

          <Text style={paragraph}>
            We received a request to reset your password for your Dream Website
            account. Click the button below to create a new password. If you
            didn&apos;t request this, you can safely ignore this email.
          </Text>

          <Section style={buttonSection}>
            <Button href={resetPasswordLink} style={button}>
              Reset Password
            </Button>
          </Section>

          <Text style={mutedText}>
            This link will expire in 1 hour for your security.
          </Text>

          <Text style={mutedText}>
            If the button doesn&apos;t work, copy and paste this link:
          </Text>

          <Text style={urlBox}>{resetPasswordLink}</Text>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            For your security, we will never ask you to verify your password,
            credit card, or banking information via email.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

ResetPassword.PreviewProps = {
  resetPasswordLink: "https://dreamwebsite.com/reset-password?token=abc123",
} satisfies ResetPasswordProps;

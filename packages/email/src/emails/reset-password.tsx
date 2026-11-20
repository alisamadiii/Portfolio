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
      <Preview>Reset your Ali Samadii Client Hub password</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Reset your password</Heading>
          <Text style={subheading}>Create a new password for your account</Text>

          <Text style={paragraph}>
            We received a request to reset the password for your Ali Samadii
            Client Hub account. Use the button below to choose a new one. If you
            didn&apos;t request this, you can ignore this email.
          </Text>

          <Section style={buttonSection}>
            <Button href={resetPasswordLink} style={button}>
              Reset Password
            </Button>
          </Section>

          <Text style={mutedText}>
            This link expires in 1 hour.
          </Text>

          <Text style={mutedText}>
            If the button doesn&apos;t work, copy and paste this link:
          </Text>

          <Text style={urlBox}>{resetPasswordLink}</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

ResetPassword.PreviewProps = {
  resetPasswordLink: "https://api.alisamadii.com/api/auth/reset-password/abc123",
} satisfies ResetPasswordProps;

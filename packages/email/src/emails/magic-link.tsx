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

interface MagicLinkProps {
  magicLinkUrl?: string;
}

export default function MagicLink({ magicLinkUrl }: MagicLinkProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to your account</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Sign in to your account</Heading>
          <Text style={subheading}>Your secure sign-in link is ready</Text>

          <Text style={paragraph}>
            Click the button below to sign in to your Dream Website account. No
            password needed — this link will log you in securely.
          </Text>

          <Section style={buttonSection}>
            <Button href={magicLinkUrl} style={button}>
              Sign In
            </Button>
          </Section>

          <Text style={mutedText}>
            This link will expire in 5 minutes for your security.
          </Text>

          <Text style={mutedText}>
            If the button doesn&apos;t work, copy and paste this link:
          </Text>

          <Text style={urlBox}>{magicLinkUrl}</Text>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            If you didn&apos;t request this sign-in link, you can safely ignore
            this email.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

MagicLink.PreviewProps = {
  magicLinkUrl:
    "https://dreamwebsite.com/api/auth/magic-link/verify?token=abc123",
} satisfies MagicLinkProps;

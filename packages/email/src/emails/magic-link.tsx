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
      <Preview>Your sign-in link for Ali Samadii Client Hub</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Sign in to Client Hub</Heading>
          <Text style={subheading}>Your sign-in link from Ali Samadii</Text>

          <Text style={paragraph}>
            Use the button below to sign in to your Ali Samadii Client Hub
            account. The link works once.
          </Text>

          <Section style={buttonSection}>
            <Button href={magicLinkUrl} style={button}>
              Sign In
            </Button>
          </Section>

          <Text style={mutedText}>
            This link expires in 5 minutes.
          </Text>

          <Text style={mutedText}>
            If the button doesn&apos;t work, copy and paste this link:
          </Text>

          <Text style={urlBox}>{magicLinkUrl}</Text>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            If you didn&apos;t request this link, you can ignore this email.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

MagicLink.PreviewProps = {
  magicLinkUrl:
    "https://api.alisamadii.com/api/auth/magic-link/verify?token=abc123",
} satisfies MagicLinkProps;

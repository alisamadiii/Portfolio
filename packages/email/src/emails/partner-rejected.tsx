import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

import {
  container,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  mutedText,
  paragraph,
  subheading,
} from "./components/shared";

// To the applicant: not approved (only sent when Ali ticks "notify").

export interface PartnerRejectedEmailProps {
  fullName: string;
}

export default function PartnerRejectedEmail({ fullName }: PartnerRejectedEmailProps) {
  const first = fullName.trim().split(/\s+/)[0] ?? fullName;
  return (
    <Html>
      <Head />
      <Preview>About your Partner Program application</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Thanks for applying</Heading>
          <Text style={subheading}>About your Partner Program application, {first}</Text>

          <Text style={paragraph}>
            We read your application carefully, and we can&apos;t approve it right now. This
            isn&apos;t a judgment of you: we keep the program small so we can give every partner
            and client real attention.
          </Text>

          <Text style={paragraph}>
            If anything changes on our side, we&apos;ll reach out. Thanks again for your interest.
          </Text>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>Ali Samadi</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

PartnerRejectedEmail.PreviewProps = {
  fullName: "Dana Brooks",
} satisfies PartnerRejectedEmailProps;

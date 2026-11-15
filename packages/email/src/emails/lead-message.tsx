import { Body, Container, Head, Html, Preview, Text } from "@react-email/components";

import { container, main, mutedText, paragraph } from "./components/shared";

// A message a client sends one of their leads from the hub's Leads inbox.
// Plain on purpose: it reads like a personal email from the business, so no
// agency header or footer.

interface LeadMessageEmailProps {
  body: string;
  businessName: string;
  senderName?: string;
}

export default function LeadMessageEmail({ body, businessName, senderName }: LeadMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{body.replace(/\s+/g, " ").slice(0, 120)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={{ ...paragraph, whiteSpace: "pre-wrap" }}>{body}</Text>
          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            {senderName ? `${senderName}, ${businessName}` : businessName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

LeadMessageEmail.templateName = "lead-message" as const;

LeadMessageEmail.PreviewProps = {
  body: "Hi Sarah,\n\nThanks for reaching out about pest control. We have an opening Thursday at 10 AM. Does that work for you?\n\nJust reply to this email to confirm.",
  businessName: "Coastal Pest Pros",
  senderName: "Mike",
} satisfies LeadMessageEmailProps;

import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

import {
  button,
  buttonSection,
  container,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  messageBox,
  mutedText,
  paragraph,
  subheading,
} from "./components/shared";

// Tells a project owner that a lead answered an email sent from the hub's
// Leads inbox. The reply itself lives in the hub thread; this is the nudge.

interface LeadReplyEmailProps {
  leadName: string;
  body: string;
  subject?: string;
  conversationUrl: string;
  imageCount?: number;
}

export default function LeadReplyEmail({
  leadName,
  body,
  subject,
  conversationUrl,
  imageCount = 0,
}: LeadReplyEmailProps) {
  const first = leadName.split(/\s+/)[0] || leadName;
  return (
    <Html>
      <Head />
      <Preview>
        {first} replied: {body.replace(/\s+/g, " ").slice(0, 100)}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />
          <Heading style={heading}>New reply from {first}</Heading>
          <Text style={subheading}>{subject ? `Re: ${subject.replace(/^re:\s*/i, "")}` : "They answered your email."}</Text>

          <Section style={messageBox}>
            <Text style={{ ...paragraph, margin: 0, whiteSpace: "pre-wrap" }}>{body || "(no text)"}</Text>
            {imageCount > 0 && (
              <Text style={{ ...mutedText, margin: "12px 0 0" }}>
                {imageCount === 1 ? "1 image attached" : `${imageCount} images attached`}
              </Text>
            )}
          </Section>

          <Section style={buttonSection}>
            <Button href={conversationUrl} style={button}>
              Open conversation
            </Button>
          </Section>

          <Text style={{ ...mutedText, textAlign: "center" }}>
            Reply from the Client Hub so the whole conversation stays in one place.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

LeadReplyEmail.templateName = "lead-reply" as const;

LeadReplyEmail.PreviewProps = {
  leadName: "Sarah Johnson",
  body: "Thursday at 10 works great, thank you! Do I need to be home for the inspection?",
  subject: "Your pest control quote",
  conversationUrl: "https://app.alisamadii.com/p/00000000-0000-0000-0000-000000000000/leads?tab=conversations&lead=42",
  imageCount: 1,
} satisfies LeadReplyEmailProps;

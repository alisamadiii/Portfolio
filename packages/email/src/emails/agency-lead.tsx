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
  Details,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  subheading,
} from "./components/shared";

// A client website form or contact widget got a new lead (api
// /api/agency/forms/[projectId] and /api/agency/contact/[projectId]).

export interface AgencyLeadEmailProps {
  siteName: string;
  lines: [string, string][];
  leadUrl: string;
  tag?: string;
  title?: string;
}

export default function AgencyLeadEmail({
  siteName,
  lines,
  leadUrl,
  tag = "New lead",
  title,
}: AgencyLeadEmailProps) {
  const headline = title ?? `Someone contacted ${siteName}`;
  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>{headline}</Heading>
          <Text style={subheading}>
            {tag} on {siteName}
          </Text>

          <Details rows={lines.map(([label, value]) => ({ label, value }))} />

          <Section style={buttonSection}>
            <Button href={leadUrl} style={button}>
              Open in Hub
            </Button>
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

AgencyLeadEmail.PreviewProps = {
  siteName: "fla2zconstruction.com",
  lines: [
    ["Name", "Maria Lopez"],
    ["Email", "maria@example.com"],
    ["Phone", "(904) 555-0142"],
    ["Message", "Hi, I need a quote for a kitchen remodel.\nAvailable weekday mornings."],
    ["Source", "Google Ads"],
  ],
  leadUrl: "https://app.alisamadii.com/p/00000000-0000-0000-0000-000000000000/agency/1",
} satisfies AgencyLeadEmailProps;

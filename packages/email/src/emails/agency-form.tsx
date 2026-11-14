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
  type DetailRow,
  Details,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  subheading,
} from "./components/shared";

// Any form on www.alisamadii.com (quote, showcase request, free preview...)
// relayed to Ali's inbox by api /api/agency/send.

export interface AgencyFormEmailProps {
  /** Form name, e.g. "Quote" or "Showcase request". */
  form: string;
  /** Who sent it: name, business or email. */
  who: string;
  rows: DetailRow[];
  /** Sender's email, for the reply button. */
  replyTo?: string;
}

export default function AgencyFormEmail({ form, who, rows, replyTo }: AgencyFormEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${form}: ${who}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>New message from {who}</Heading>
          <Text style={subheading}>{form} form on www.alisamadii.com</Text>

          <Details rows={rows} />

          {replyTo && (
            <Section style={buttonSection}>
              <Button href={`mailto:${replyTo}`} style={button}>
                Reply to {who.split(" ")[0]}
              </Button>
            </Section>
          )}

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

AgencyFormEmail.PreviewProps = {
  form: "Free preview",
  who: "Sam Carter",
  rows: [
    { label: "Name", value: "Sam Carter" },
    { label: "Email", value: "sam@example.com", href: "mailto:sam@example.com" },
    { label: "Phone", value: "(904) 555-0123", href: "tel:9045550123" },
    { label: "Business", value: "Carter Landscaping" },
    { label: "Message", value: "Would love to see a preview of a new site." },
    { label: "Referral", value: "Referred by Ali Samadi (ALI)" },
    { label: "Page", value: "https://www.alisamadii.com/", href: "https://www.alisamadii.com/" },
  ],
  replyTo: "sam@example.com",
} satisfies AgencyFormEmailProps;

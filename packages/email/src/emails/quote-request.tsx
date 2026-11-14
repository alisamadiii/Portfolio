import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
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
  hr,
  label,
  main,
  messageBox,
  mutedText,
  paragraph,
  subheading,
} from "./components/shared";

// "Get a Quote" form on www.alisamadii.com (api /api/agency/quote).

export interface QuoteRequestEmailProps {
  name: string;
  email: string;
  message: string;
  business?: string;
  /** Readable plan, e.g. "Website only, no ads: $699 setup + $25/mo". */
  plan?: string;
  phone?: string;
}

export default function QuoteRequestEmail({
  name,
  email,
  message,
  business,
  plan,
  phone,
}: QuoteRequestEmailProps) {
  const rows: DetailRow[] = [
    { label: "Name", value: name },
    { label: "Email", value: email, href: `mailto:${email}` },
    ...(plan ? [{ label: "Interested in", value: plan }] : []),
    ...(business ? [{ label: "Business", value: business }] : []),
    ...(phone ? [{ label: "Phone", value: phone, href: `tel:${phone}` }] : []),
  ];
  return (
    <Html>
      <Head />
      <Preview>{`${name} wants a quote`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>New quote request</Heading>
          <Text style={subheading}>{name} wants a quote</Text>

          <Details rows={rows} />

          <Hr style={hr} />

          <Text style={{ ...label, margin: "0 0 4px" }}>Project details</Text>
          <Section style={messageBox}>
            <Text style={{ ...paragraph, margin: 0, whiteSpace: "pre-wrap" }}>{message}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button
              href={`mailto:${email}?subject=${encodeURIComponent("Re: your quote request")}`}
              style={button}
            >
              Reply to {name.split(" ")[0]}
            </Button>
          </Section>

          <Text style={{ ...mutedText, textAlign: "center" }}>
            Sent from the Get a Quote form on www.alisamadii.com
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

QuoteRequestEmail.PreviewProps = {
  name: "Jordan Reed",
  email: "jordan@example.com",
  message: "We're a family-run pest control company and need a new website with online booking.",
  business: "Reed Pest Control",
  plan: "Website only, no ads: $699 setup + $25/mo",
  phone: "(904) 555-0199",
} satisfies QuoteRequestEmailProps;

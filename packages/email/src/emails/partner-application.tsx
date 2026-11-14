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

// To Ali: someone applied on partners.alisamadii.com.

export interface PartnerApplicationEmailProps {
  fullName: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  city: string | null;
  knowOwners: string | null;
  whyJoin: string | null;
  adminUrl: string;
}

export default function PartnerApplicationEmail(a: PartnerApplicationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New partner application: ${a.fullName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>New partner application</Heading>
          <Text style={subheading}>{a.fullName} applied to the Partner Program</Text>

          <Details
            rows={[
              { label: "Name", value: a.fullName },
              { label: "Email", value: a.email, href: `mailto:${a.email}` },
              a.phone
                ? { label: "Phone", value: a.phone, href: `tel:${a.phone}` }
                : { label: "Phone", value: "Not provided" },
              { label: "Occupation", value: a.occupation ?? "Not provided" },
              { label: "City", value: a.city ?? "Not provided" },
              { label: "Knows owners through", value: a.knowOwners ?? "Not provided" },
              { label: "Why join", value: a.whyJoin ?? "Not provided" },
            ]}
          />

          <Section style={buttonSection}>
            <Button href={a.adminUrl} style={button}>
              Review in admin
            </Button>
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

PartnerApplicationEmail.PreviewProps = {
  fullName: "Dana Brooks",
  email: "dana@example.com",
  phone: "(904) 555-0177",
  occupation: "Real estate agent",
  city: "Jacksonville, FL",
  knowOwners: "I work with a lot of local contractors and shop owners.",
  whyJoin: null,
  adminUrl: "https://admin.alisamadii.com/partners/00000000-0000-0000-0000-000000000000",
} satisfies PartnerApplicationEmailProps;

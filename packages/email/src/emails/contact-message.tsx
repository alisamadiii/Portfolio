import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
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
  hr,
  label,
  main,
  mutedText,
  paragraph,
  subheading,
  textLink,
  value,
} from "./components/shared";

interface ContactFormEmailProps {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  phone?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  submittedAt?: string;
  pageUrl?: string;
  clientName: string;
}

export default function ContactFormEmail({
  name = "",
  email = "",
  subject = "",
  message = "",
  phone,
  ipAddress = "Unknown",
  userAgent = "Unknown",
  referer,
  submittedAt = new Date().toISOString(),
  pageUrl,
  clientName,
}: ContactFormEmailProps) {
  const actionButtons = (
    <Section style={buttonSection}>
      <Button href={`mailto:${email}?subject=Re: ${subject}`} style={button}>
        Reply to {name.split(" ")[0]}
      </Button>
      {phone && (
        <Button href={`tel:${phone.replace(/\s/g, "")}`} style={outlineButton}>
          Call {phone}
        </Button>
      )}
    </Section>
  );

  return (
    <Html>
      <Head />
      <Preview>
        New contact from {name}: {subject}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>New contact message</Heading>
          <Text style={subheading}>{name} just reached out</Text>

          {actionButtons}

          <Text style={{ ...label, margin: "0 0 4px" }}>Name</Text>
          <Text style={value}>{name}</Text>

          <Text style={label}>Email</Text>
          <Link href={`mailto:${email}`} style={{ ...value, ...textLink }}>
            {email}
          </Link>

          {phone && (
            <>
              <Text style={label}>Phone</Text>
              <Text style={value}>{phone}</Text>
            </>
          )}

          <Hr style={hr} />

          <Text style={{ ...label, margin: "0 0 4px" }}>Subject</Text>
          <Text style={{ ...value, fontWeight: 600 }}>{subject}</Text>

          <Text style={label}>Message</Text>
          <Section style={messageBox}>
            <Text style={{ ...paragraph, margin: 0, whiteSpace: "pre-wrap" }}>
              {message}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={{ ...label, margin: "0 0 4px" }}>Date</Text>
          <Text style={value}>
            {new Date(submittedAt).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </Text>

          <Text style={label}>Source</Text>
          <Text style={value}>{clientName} — Contact Form</Text>

          <Text style={label}>Device</Text>
          <Text style={value}>{userAgent}</Text>

          <Text style={label}>IP Address</Text>
          <Text style={value}>{ipAddress}</Text>

          {actionButtons}

          {(referer || pageUrl) && (
            <>
              <Hr style={hr} />
              {referer && (
                <Text style={{ ...mutedText, margin: "0 0 4px" }}>
                  Referer: {referer}
                </Text>
              )}
              {pageUrl && (
                <Text style={{ ...mutedText, margin: 0 }}>Page: {pageUrl}</Text>
              )}
            </>
          )}

          <Text style={{ ...mutedText, margin: "24px 0 0", textAlign: "center" }}>
            Powered by{" "}
            <Link
              href="https://alisamadii.com"
              style={{ color: "#9ca3af", textDecoration: "underline" }}
            >
              AliSamadii LLC
            </Link>
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

ContactFormEmail.templateName = "contact-form" as const;

ContactFormEmail.PreviewProps = {
  name: "John Doe",
  email: "john@example.com",
  subject: "Partnership Inquiry",
  message:
    "Hi there,\n\nI'm interested in discussing a potential partnership. We've been following your work and think there's a great opportunity to collaborate.\n\nLooking forward to hearing from you.\n\nBest regards,\nJohn",
  phone: "+1 (555) 123-4567",
  ipAddress: "203.0.113.42",
  userAgent: "Chrome (macOS)",
  referer: "https://google.com",
  submittedAt: "2026-05-31T14:30:00.000Z",
  pageUrl: "https://alisamadii.com/contact",
  clientName: "Ali Samadi",
} satisfies ContactFormEmailProps;

const messageBox: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #eaeaea",
  borderRadius: "12px",
  padding: "16px",
};

const outlineButton: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #fc8464",
  borderRadius: "16px",
  color: "#c2451f",
  display: "block",
  fontSize: "16px",
  fontWeight: 600,
  marginTop: "8px",
  padding: "16px",
  textAlign: "center",
  textDecoration: "none",
  width: "100%",
};

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface ContactMessageProps {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  siteName?: string;
  metadata?: Record<string, unknown>;
}

const left: React.CSSProperties = { textAlign: "left" };

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ContactMessage({
  name,
  email,
  phone,
  message,
  siteName = "your website",
  metadata,
}: ContactMessageProps) {
  const metaEntries = metadata
    ? Object.entries(metadata).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    : [];

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#ffffff",
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <Preview>{message?.trim() || `New message from ${name}`}</Preview>
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "40px 24px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            {/* Header */}
            <Text
              style={{
                ...left,
                margin: 0,
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#6b7280",
              }}
            >
              New Contact Message
            </Text>
            <Heading
              style={{
                ...left,
                marginTop: "8px",
                marginBottom: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#111111",
              }}
            >
              {name} reached out via {siteName}
            </Heading>

            <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />

            {/* Sender */}
            <Text
              style={{
                ...left,
                margin: "0 0 4px",
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#6b7280",
              }}
            >
              From
            </Text>
            <Text
              style={{
                ...left,
                margin: 0,
                fontSize: "14px",
                fontWeight: 600,
                color: "#111111",
              }}
            >
              {name}
            </Text>
            <Link
              href={`mailto:${email}`}
              style={{
                ...left,
                fontSize: "14px",
                color: "#555555",
                textDecoration: "none",
              }}
            >
              {email}
            </Link>
            {phone && (
              <Text
                style={{
                  ...left,
                  margin: "2px 0 0",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                {phone}
              </Text>
            )}

            <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />

            {/* Message */}
            <Text
              style={{
                ...left,
                margin: "0 0 4px",
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#6b7280",
              }}
            >
              Message
            </Text>
            <Text
              style={{
                ...left,
                margin: 0,
                fontSize: "16px",
                lineHeight: "26px",
                fontWeight: 600,
                color: "#111111",
              }}
            >
              {message?.trim()}
            </Text>

            {/* Additional details */}
            {metaEntries.length > 0 && (
              <>
                <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
                <Text
                  style={{
                    ...left,
                    margin: "0 0 8px",
                    fontSize: "11px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6b7280",
                  }}
                >
                  Additional Details
                </Text>
                {metaEntries.map(([key, value]) => (
                  <Text
                    key={key}
                    style={{
                      ...left,
                      margin: "0 0 4px",
                      fontSize: "14px",
                      lineHeight: "20px",
                      color: "#333333",
                    }}
                  >
                    <span style={{ color: "#888888" }}>{formatKey(key)}:</span>{" "}
                    {String(value)}
                  </Text>
                ))}
              </>
            )}

            <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />

            {/* Reply CTA */}
            <Link
              href={`mailto:${email}?subject=${encodeURIComponent(`Re: Your message to ${siteName}`)}&body=${encodeURIComponent(`\n\n---\nOn your original message:\n\n${message}`)}`}
              style={{
                ...left,
                fontSize: "14px",
                fontWeight: 500,
                color: "#111111",
                textDecoration: "none",
              }}
            >
              Reply to {name} →
            </Link>

            {/* Footer */}
            <Text
              style={{
                ...left,
                margin: "48px 0 0",
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              Delivered by AliSamadii.LLC · This message was sent via the
              contact form on {siteName}
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  );
}

ContactMessage.PreviewProps = {
  name: "John Doe",
  email: "john@example.com",
  phone: "+1 (555) 123-4567",
  message:
    "Hi there! I'm interested in learning more about your services. Could we schedule a call this week?",
  siteName: "Acme Corp",
  metadata: {
    company: "Acme Corporation",
    projectBudget: "$5,000 - $10,000",
    preferredContactTime: "Afternoons, PST",
  },
} satisfies ContactMessageProps;

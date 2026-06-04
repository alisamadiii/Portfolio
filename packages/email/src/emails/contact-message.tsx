import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
  const initial = name.charAt(0).toUpperCase();

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#ffffff",
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Preview>
          New contact from {name}: {subject}
        </Preview>

        <Container style={{ maxWidth: "600px", margin: "0 auto" }}>
          {/* Blue accent bar */}
          <Section
            style={{
              backgroundColor: "#2563eb",
              height: "4px",
              width: "100%",
            }}
          />

          {/* Header with avatar */}
          <Section style={{ padding: "32px 32px 0" }}>
            <table cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ width: "52px", verticalAlign: "top" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        fontSize: "20px",
                        fontWeight: 700,
                        lineHeight: "48px",
                        textAlign: "center",
                      }}
                    >
                      {initial}
                    </div>
                  </td>
                  <td style={{ verticalAlign: "top", paddingLeft: "12px" }}>
                    <Text
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {name}
                    </Text>
                    <Link
                      href={`mailto:${email}`}
                      style={{
                        fontSize: "14px",
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                    >
                      {email}
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Meta info row */}
          <Section style={{ padding: "20px 32px 0" }}>
            <table cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      paddingBottom: "6px",
                      width: "100px",
                    }}
                  >
                    Date:
                  </td>
                  <td
                    style={{
                      fontSize: "13px",
                      color: "#111827",
                      paddingBottom: "6px",
                    }}
                  >
                    {new Date(submittedAt).toLocaleString("en-US", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      paddingBottom: "6px",
                    }}
                  >
                    Source:
                  </td>
                  <td
                    style={{
                      fontSize: "13px",
                      color: "#111827",
                      paddingBottom: "6px",
                    }}
                  >
                    {clientName} — Contact Form
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      paddingBottom: "6px",
                    }}
                  >
                    Device:
                  </td>
                  <td
                    style={{
                      fontSize: "13px",
                      color: "#111827",
                      paddingBottom: "6px",
                    }}
                  >
                    {userAgent}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: "13px", color: "#6b7280" }}>
                    IP Address:
                  </td>
                  <td style={{ fontSize: "13px", color: "#111827" }}>
                    {ipAddress}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr
            style={{
              borderColor: "#e5e7eb",
              margin: "24px 32px",
            }}
          />

          {/* Form fields */}
          <Section style={{ padding: "0 32px" }}>
            {/* Subject */}
            <Text
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Subject
            </Text>
            <Text
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#111827",
                margin: "0 0 24px",
              }}
            >
              {subject}
            </Text>

            {phone && (
              <>
                <Text
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "0 0 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Phone
                </Text>
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#111827",
                    margin: "0 0 24px",
                  }}
                >
                  {phone}
                </Text>
              </>
            )}

            {/* Message */}
            <Text
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Message
            </Text>
            <Section
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: "#1e293b",
                  margin: 0,
                }}
              >
                {message}
              </Text>
            </Section>
          </Section>

          <Hr
            style={{
              borderColor: "#e5e7eb",
              margin: "0 32px 24px",
            }}
          />

          {/* Action buttons */}
          <Section style={{ padding: "0 32px 32px" }}>
            <Link
              href={`mailto:${email}?subject=Re: ${subject}`}
              style={{
                display: "block",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "14px 0",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                width: "100%",
              }}
            >
              Reply to {name.split(" ")[0]}
            </Link>
            {phone && (
              <Link
                href={`tel:${phone.replace(/\s/g, "")}`}
                style={{
                  display: "block",
                  backgroundColor: "#ffffff",
                  color: "#2563eb",
                  borderRadius: "8px",
                  border: "1px solid #2563eb",
                  padding: "14px 0",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  width: "100%",
                  marginTop: "8px",
                }}
              >
                Call {phone}
              </Link>
            )}
          </Section>

          {/* Footer metadata */}
          {(referer || pageUrl) && (
            <Section
              style={{
                padding: "16px 32px",
                borderTop: "1px solid #f3f4f6",
              }}
            >
              <table
                cellPadding={0}
                cellSpacing={0}
                style={{ width: "100%", fontSize: "11px", color: "#9ca3af" }}
              >
                <tbody>
                  {referer && (
                    <tr>
                      <td style={{ padding: "2px 0", width: "60px" }}>
                        Referer
                      </td>
                      <td style={{ padding: "2px 0" }}>{referer}</td>
                    </tr>
                  )}
                  {pageUrl && (
                    <tr>
                      <td style={{ padding: "2px 0", width: "60px" }}>Page</td>
                      <td style={{ padding: "2px 0" }}>{pageUrl}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          )}

          {/* Powered by footer */}
          <Section style={{ padding: "24px 32px 32px", textAlign: "center" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#9ca3af",
              }}
            >
              Powered by{" "}
              <Link
                href="https://alisamadii.com"
                style={{ color: "#9ca3af", textDecoration: "underline" }}
              >
                AliSamadii LLC
              </Link>
            </Text>
          </Section>
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

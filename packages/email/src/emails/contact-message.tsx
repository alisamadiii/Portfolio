import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
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

const PRIMARY_COLOR = "#FC8464";
const LOGO_URL = "https://cdn.alisamadii.com/company/logo-white.png";
const COMPANY_NAME = "AliSamadii.LLC";

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
      <Tailwind>
        <Body
          className="font-sans"
          style={{
            backgroundColor: PRIMARY_COLOR,
            margin: 0,
            padding: 0,
          }}
        >
          <Preview>{`New message from ${name} via ${siteName}`}</Preview>
          <Container className="mx-auto max-w-xl px-4 py-12">
            {/* Brand header */}
            <Section className="mb-6 text-center">
              <Img
                src={LOGO_URL}
                width="40"
                height="40"
                alt={COMPANY_NAME}
                style={{ margin: "0 auto", display: "block" }}
              />
              <Text
                className="m-0 mt-2 text-xs"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                Contact Message &middot; {COMPANY_NAME}
              </Text>
            </Section>

            {/* Card */}
            <Section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <Section className="px-10 pt-10 pb-6">
                <Heading
                  className="mt-0 mb-4 text-2xl font-bold"
                  style={{ color: "#111111" }}
                >
                  New contact message
                </Heading>
                <Text className="mb-2 text-base leading-6 text-gray-600">
                  You received a new message through the {siteName} contact
                  form.
                </Text>

                {/* Sender info */}
                <Section
                  className="mb-6 p-4"
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <Text className="m-0 mb-1 text-xs font-semibold tracking-widest text-gray-500 uppercase">
                    From
                  </Text>
                  <Text
                    className="m-0 mb-1 text-base font-semibold"
                    style={{ color: "#111111" }}
                  >
                    {name}
                  </Text>
                  <Link
                    href={`mailto:${email}`}
                    className="text-sm no-underline"
                    style={{ color: PRIMARY_COLOR }}
                  >
                    {email}
                  </Link>
                  {phone && (
                    <Text className="m-0 mt-1 text-sm text-gray-600">
                      {phone}
                    </Text>
                  )}
                </Section>

                {/* Message */}
                <Section
                  className="mb-6 p-4"
                  style={{
                    backgroundColor: "#f9f9f9",
                    borderRadius: "8px",
                    border: "1px solid #eeeeee",
                  }}
                >
                  <Text className="m-0 mb-1 text-xs font-semibold tracking-widest text-gray-500 uppercase">
                    Message
                  </Text>
                  <Text
                    className="m-0 text-base leading-6"
                    style={{ color: "#333333" }}
                  >
                    {message?.trim()}
                  </Text>
                </Section>

                {/* Additional details */}
                {metaEntries.length > 0 && (
                  <Section
                    className="mb-6 p-4"
                    style={{
                      backgroundColor: "#f5f5f5",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Text className="m-0 mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
                      Additional Details
                    </Text>
                    {metaEntries.map(([key, value]) => (
                      <Text
                        key={key}
                        className="m-0 mb-1 text-sm leading-5"
                        style={{ color: "#333333" }}
                      >
                        <span className="font-semibold text-gray-600">
                          {formatKey(key)}:
                        </span>{" "}
                        {String(value)}
                      </Text>
                    ))}
                  </Section>
                )}

                {/* Reply CTA */}
                <Section className="text-center">
                  <Link
                    href={`mailto:${email}?subject=${encodeURIComponent(`Re: Your message to ${siteName}`)}&body=${encodeURIComponent(`\n\n---\nOn your original message:\n\n${message}`)}`}
                    className="inline-block px-8 py-3 text-base font-semibold text-white no-underline"
                    style={{
                      backgroundColor: PRIMARY_COLOR,
                      borderRadius: "8px",
                      color: "#ffffff",
                    }}
                  >
                    Reply to {name}
                  </Link>
                </Section>
              </Section>

              {/* Footer inside card */}
              <Section
                className="px-10 py-6"
                style={{ borderTop: "1px solid #f0f0f0" }}
              >
                <Text className="m-0 text-xs text-gray-400">
                  This message was sent via the contact form on {siteName}
                </Text>
              </Section>
            </Section>

            {/* Outer footer */}
            <Section className="mt-6 text-center">
              <Text
                className="m-0 text-xs"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                &copy; {new Date().getFullYear()} {COMPANY_NAME}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
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

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ClientMessageProps {
  subject: string;
  message: string;
  clientEmail?: string;
  originalSubject?: string;
  originalMessage?: string;
  referenceId?: string;
}

export default function ClientMessage({
  subject,
  message,
  clientEmail,
  originalSubject,
  originalMessage,
  referenceId,
}: ClientMessageProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>{subject}</Preview>
          <Container className="mx-auto max-w-xl py-12 px-4">
            <Section className="mb-6 text-center">
              <Img
                src="https://cdn.alisamadii.com/company/logo-white.png"
                width="40"
                height="40"
                alt="Logo"
                style={{ margin: "0 auto", display: "block" }}
              />
              <Text
                className="m-0 mt-2 text-xs"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                AliSamadii.LLC &middot; Portland, OR
              </Text>
            </Section>

            <Section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <Section className="px-10 pt-10 pb-6">
                {/* Original message context */}
                {(originalSubject || originalMessage) && (
                  <Section
                    className="mb-6 p-4"
                    style={{
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      borderLeft: "4px solid #d1d5db",
                    }}
                  >
                    <Text className="m-0 mb-1 text-xs font-semibold uppercase text-gray-400">
                      Your message
                    </Text>
                    {clientEmail && (
                      <Text className="m-0 mb-2 text-xs text-gray-400">
                        From: {clientEmail}
                      </Text>
                    )}
                    {originalSubject && (
                      <Text className="m-0 mb-1 text-sm font-semibold text-gray-600">
                        {originalSubject}
                      </Text>
                    )}
                    {originalMessage && (
                      <Text className="m-0 whitespace-pre-line text-sm leading-6 text-gray-500">
                        {originalMessage}
                      </Text>
                    )}
                  </Section>
                )}

                {/* Admin reply */}
                <Text className="mb-4 text-xl font-bold text-gray-900">
                  {subject}
                </Text>

                <Text className="mb-6 whitespace-pre-line text-base leading-6 text-gray-600">
                  {message}
                </Text>

                <Hr style={{ borderColor: "#f0f0f0" }} className="my-6" />

                <Text className="mb-1 text-base font-medium text-gray-700">
                  Best,
                </Text>
                <Text
                  className="mb-0 text-base font-semibold"
                  style={{ color: "#111111" }}
                >
                  Ali Samadii
                </Text>
                <Text className="mt-0 text-sm text-gray-500">
                  AliSamadii.LLC
                </Text>

                {referenceId && (
                  <Text className="mt-6 text-center text-xs text-gray-400">
                    Reference: #{referenceId}
                  </Text>
                )}
              </Section>
            </Section>

            <Section className="mt-6 text-center">
              <Text
                className="m-0 text-xs"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Portland, OR &middot; Web design, development &amp; managed
                hosting
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ClientMessage.PreviewProps = {
  subject: "Re: Service Change Request",
  message:
    "Hi! Thanks for reaching out. I've reviewed your request and will get started on the changes this week. Let me know if you have any questions.",
  clientEmail: "client@example.com",
  originalSubject: "Service Change Request",
  originalMessage:
    "I'd like to add an e-commerce section to my website. Can we discuss pricing?",
} satisfies ClientMessageProps;

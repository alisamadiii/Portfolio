import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface AgencyNotificationProps {
  clientEmail?: string;
  projectType: string;
  subject: string;
  message: string;
  priority: string;
  referenceId: string;
}

const priorityColor: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

export default function AgencyNotification({
  clientEmail,
  projectType,
  subject,
  message,
  priority,
  referenceId,
}: AgencyNotificationProps) {
  const color = priorityColor[priority] ?? "#eab308";

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>
            [{priority}] {subject} — from {clientEmail ?? "guest"}
          </Preview>
          <Container className="mx-auto max-w-xl py-12 px-4">
            {/* Brand header */}
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
                Portal Notification &middot; AliSamadii.LLC
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
                {/* Priority + project badge row */}
                <Section className="mb-6 flex gap-2">
                  <Text
                    className="m-0 inline-block rounded px-2 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {priority}
                  </Text>
                  <Text
                    className="m-0 ml-2 inline-block rounded px-2 py-1 text-xs font-medium text-gray-600"
                    style={{ backgroundColor: "#f3f4f6" }}
                  >
                    {projectType}
                  </Text>
                </Section>

                <Heading className="mb-2 text-xl font-bold text-gray-900">
                  {subject}
                </Heading>

                <Text className="mb-6 text-base leading-6 text-gray-600">
                  {message}
                </Text>

                <Hr style={{ borderColor: "#f0f0f0" }} className="my-6" />

                <Text className="m-0 text-sm text-gray-500">
                  From:{" "}
                  <span className="font-medium text-gray-700">
                    {clientEmail ?? "Guest (not logged in)"}
                  </span>
                </Text>
                <Text className="m-0 mt-1 text-xs text-gray-400">
                  Reference ID: #{referenceId}
                </Text>
              </Section>
            </Section>

            <Section className="mt-6 text-center">
              <Text
                className="m-0 text-xs"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                AliSamadii.LLC &middot; Portland, OR
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

AgencyNotification.PreviewProps = {
  clientEmail: "client@example.com",
  projectType: "AGENCY",
  subject: "Service Change Request",
  message: "I'd like to upgrade my plan to include the e-commerce module.",
  priority: "HIGH",
  referenceId: "abc-123",
} satisfies AgencyNotificationProps;

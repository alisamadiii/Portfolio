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

interface AccountDeletedProps {
  userName?: string;
  feedbackLink?: string;
}

export default function AccountDeleted({
  userName = "there",
  feedbackLink = "https://www.alisamadii.com/feedback",
}: AccountDeletedProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>We&apos;re sorry to see you go - Dream Website</Preview>
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
                  We&apos;re sorry to see you go
                </Heading>

                <Text className="mb-4 text-base leading-6 text-gray-600">
                  Hi {userName},
                </Text>
                <Text className="mb-4 text-base leading-6 text-gray-600">
                  Your account has been successfully deleted as you requested.
                  We&apos;re genuinely sad to see you leave, and it was a
                  pleasure having you as part of our community.
                </Text>
                <Text className="mb-6 text-base leading-6 text-gray-600">
                  If there was something we could have done better, we&apos;d
                  love to hear from you — your feedback helps us improve for
                  everyone.
                </Text>

                {/* CTA */}
                <Section className="mb-6 text-center">
                  <Link
                    href={feedbackLink}
                    className="inline-block px-8 py-3 text-base font-semibold text-white no-underline"
                    style={{
                      backgroundColor: "#FC8464",
                      borderRadius: "8px",
                      color: "#ffffff",
                    }}
                  >
                    Share Your Feedback
                  </Link>
                </Section>

                {/* What happens now */}
                <Section
                  className="mb-6 p-5"
                  style={{
                    backgroundColor: "#fff5f2",
                    borderRadius: "8px",
                    borderLeft: "4px solid #FC8464",
                  }}
                >
                  <Text
                    className="mt-0 mb-3 text-sm font-semibold"
                    style={{ color: "#111111" }}
                  >
                    What happens now?
                  </Text>
                  <Text className="my-1 text-sm text-gray-600">
                    &bull; Your account and personal data have been permanently
                    deleted
                  </Text>
                  <Text className="my-1 text-sm text-gray-600">
                    &bull; Any active subscriptions have been cancelled
                  </Text>
                  <Text className="my-1 text-sm text-gray-600">
                    &bull; You might receive some emails from us
                  </Text>
                  <Text className="my-0 text-sm text-gray-600">
                    &bull; You&apos;re welcome to create a new account anytime
                    if you change your mind
                  </Text>
                </Section>

                <Text className="mb-4 text-base leading-6 text-gray-600">
                  If you ever want to come back, you can create a new account
                  anytime at{" "}
                  <Link
                    href="https://portal.alisamadii.com/signup"
                    style={{ color: "#FC8464" }}
                    className="no-underline"
                  >
                    alisamadii.com
                  </Link>
                  .
                </Text>

                <Text className="mb-6 text-base leading-6 text-gray-600">
                  Thank you for giving us a try. We wish you all the best.
                </Text>

                <Text className="m-0 text-base leading-6 text-gray-600">
                  Take care,
                  <br />
                  <span style={{ color: "#111111", fontWeight: 600 }}>
                    The AliSamadii.LLC Team
                  </span>
                </Text>
              </Section>

              {/* Footer inside card */}
              <Section
                className="px-10 py-6"
                style={{ borderTop: "1px solid #f0f0f0" }}
              >
                <Text className="m-0 text-xs text-gray-400">
                  This is a confirmation email sent by AliSamadii.LLC regarding
                  your account deletion. If you didn&apos;t request this,
                  contact our support team immediately. View our{" "}
                  <Link
                    href="https://www.alisamadii.com/privacy"
                    style={{ color: "#FC8464" }}
                    className="no-underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="https://www.alisamadii.com/terms"
                    style={{ color: "#FC8464" }}
                    className="no-underline"
                  >
                    Terms of Service
                  </Link>
                  .
                </Text>
              </Section>
            </Section>

            {/* Outer footer */}
            <Section className="mt-6 text-center">
              <Text className="m-0 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                &copy; {new Date().getFullYear()} Dream Website · AliSamadii.LLC
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

AccountDeleted.PreviewProps = {
  userName: "John Doe",
  feedbackLink: "https://www.alisamadii.com/feedback",
} satisfies AccountDeletedProps;

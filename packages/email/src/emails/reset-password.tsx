import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ResetPasswordProps {
  resetPasswordLink?: string;
}

export default function ResetPassword({
  resetPasswordLink,
}: ResetPasswordProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>Dream Website Password Reset</Preview>
          <Container className="mx-auto max-w-xl py-12 px-4">
            {/* Brand header */}
            <Section className="mb-6 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_rp)">
                  <path
                    d="M70.5869 82.0243H97.8874V100H70.5869V82.0243ZM46.4913 0L34.6717 20.9415H48.0666L29.2434 54.293H58.894L70.5869 33.576V57.6897H13.9329L2.11328 78.6276H15.5081L3.44588 100H33.1L45.1623 78.6276H97.8874V0H46.4913Z"
                    fill="#ffffff"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_rp">
                    <rect width="100" height="100" fill="white" />
                  </clipPath>
                </defs>
              </svg>
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
                  Reset your password
                </Heading>
                <Text className="mb-6 text-base leading-6 text-gray-600">
                  We received a request to reset your password for your Dream
                  Website account. Click the button below to create a new
                  password. If you didn&apos;t request this, you can safely
                  ignore this email.
                </Text>

                {/* CTA */}
                <Section className="mb-6 text-center">
                  <Link
                    href={resetPasswordLink}
                    className="inline-block px-8 py-3 text-base font-semibold text-white no-underline"
                    style={{
                      backgroundColor: "#FC8464",
                      borderRadius: "8px",
                      color: "#ffffff",
                    }}
                  >
                    Reset Password
                  </Link>
                </Section>

                <Text className="mb-4 text-sm text-gray-500">
                  This link will expire in 1 hour for your security.
                </Text>

                <Text className="mb-2 text-sm text-gray-500">
                  If the button doesn&apos;t work, copy and paste this link:
                </Text>

                <Text
                  className="p-3 text-xs break-all text-gray-400"
                  style={{
                    backgroundColor: "#f9f9f9",
                    borderRadius: "6px",
                    border: "1px solid #eeeeee",
                  }}
                >
                  {resetPasswordLink}
                </Text>
              </Section>

              {/* Footer inside card */}
              <Section
                className="px-10 py-6"
                style={{ borderTop: "1px solid #f0f0f0" }}
              >
                <Text className="mb-2 text-xs text-gray-400">
                  For your security, we will never ask you to verify your
                  password, credit card, or banking information via email.
                </Text>
                <Text className="m-0 text-xs text-gray-400">
                  Questions?{" "}
                  <Link
                    href="mailto:a@alisamadii.com"
                    style={{ color: "#FC8464" }}
                    className="no-underline"
                  >
                    Contact support
                  </Link>{" "}
                  &middot;{" "}
                  <Link
                    href="https://www.alisamadii.com/privacy"
                    style={{ color: "#FC8464" }}
                    className="no-underline"
                  >
                    Privacy
                  </Link>{" "}
                  &middot;{" "}
                  <Link
                    href="https://www.alisamadii.com/terms"
                    style={{ color: "#FC8464" }}
                    className="no-underline"
                  >
                    Terms
                  </Link>
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

ResetPassword.PreviewProps = {
  resetPasswordLink: "https://dreamwebsite.com/reset-password?token=abc123",
} satisfies ResetPasswordProps;

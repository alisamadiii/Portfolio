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

interface VerifyEmailProps {
  verificationCode?: string;
}

export default function VerifyEmail({ verificationCode }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>Dream Website Email Verification</Preview>
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
                <g clipPath="url(#clip0_ve)">
                  <path
                    d="M70.5869 82.0243H97.8874V100H70.5869V82.0243ZM46.4913 0L34.6717 20.9415H48.0666L29.2434 54.293H58.894L70.5869 33.576V57.6897H13.9329L2.11328 78.6276H15.5081L3.44588 100H33.1L45.1623 78.6276H97.8874V0H46.4913Z"
                    fill="#ffffff"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_ve">
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
                  Verify your email address
                </Heading>
                <Text className="mb-6 text-base leading-6 text-gray-600">
                  Welcome to Dream Website! To complete your account setup,
                  please use the verification code below.
                </Text>

                {/* Code box */}
                <Section
                  className="mb-6 p-6 text-center"
                  style={{
                    backgroundColor: "#fff5f2",
                    borderRadius: "8px",
                    border: "1px solid #fdd5c8",
                  }}
                >
                  <Text
                    className="mb-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "#FC8464" }}
                  >
                    Verification Code
                  </Text>
                  <Text
                    className="my-2 font-mono text-4xl font-bold"
                    style={{ color: "#111111", letterSpacing: "0.15em" }}
                  >
                    {verificationCode}
                  </Text>
                  <Text className="m-0 text-xs text-gray-500">
                    Valid for 10 minutes
                  </Text>
                </Section>

                <Text className="text-sm text-gray-500">
                  If you didn&apos;t create an account, you can safely ignore
                  this email.
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

VerifyEmail.PreviewProps = {
  verificationCode: "596853",
} satisfies VerifyEmailProps;

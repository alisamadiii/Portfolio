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
        <Body className="bg-white font-sans text-black">
          <Preview>Dream Website Email Verification</Preview>
          <Container className="mx-auto max-w-2xl p-8">
            <Section className="bg-white">
              <Section className="p-8">
                <Heading className="mb-6 text-2xl font-bold text-black">
                  Verify your email address
                </Heading>
                <Text className="mb-6 text-base leading-6 text-gray-700">
                  Welcome to Dream Website! We&apos;re excited to have you join
                  our community. To complete your account setup, please verify
                  your email address by entering the verification code below.
                </Text>

                <Section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <Text className="mb-2 text-sm font-semibold text-black">
                    Verification code
                  </Text>
                  <Text className="mb-2 font-mono text-4xl font-bold text-black">
                    {verificationCode}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    This code is valid for 10 minutes
                  </Text>
                </Section>

                <Text className="mb-6 text-sm text-gray-600">
                  If you didn&apos;t create an account, you can safely ignore
                  this email.
                </Text>
              </Section>

              <Section className="border-t border-gray-200 p-8">
                <Text className="mb-4 text-sm text-gray-600">
                  For your security, we will never ask you to verify your
                  password, credit card, or banking information via email.
                </Text>

                <Text className="text-xs text-gray-500">
                  This email was sent by Dream Website. If you have any
                  questions, please{" "}
                  <Link
                    href="mailto:a@alisamadii.com"
                    className="text-black underline"
                  >
                    contact our support team
                  </Link>
                  . View our{" "}
                  <Link
                    href="https://www.alisamadii.com/privacy"
                    className="text-black underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="https://www.alisamadii.com/terms"
                    className="text-black underline"
                  >
                    Terms of Service
                  </Link>
                  .
                </Text>
              </Section>
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

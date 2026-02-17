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
        <Body className="bg-white font-sans text-black">
          <Preview>Dream Website Password Reset</Preview>
          <Container className="mx-auto max-w-2xl p-8">
            <Section className="bg-white">
              <Section className="p-8">
                <Heading className="mb-6 text-2xl font-bold text-black">
                  Reset your password
                </Heading>
                <Text className="mb-6 text-base leading-6 text-gray-700">
                  We received a request to reset your password for your Dream
                  Website account. Click the button below to create a new
                  password. If you didn&apos;t request this, you can safely
                  ignore this email.
                </Text>

                <Section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <Link
                    href={resetPasswordLink}
                    className="inline-block rounded-lg bg-black px-8 py-3 text-base font-semibold text-white no-underline"
                  >
                    Reset Password
                  </Link>
                </Section>

                <Text className="mb-6 text-sm text-gray-600">
                  This link will expire in 1 hour for your security.
                </Text>

                <Text className="mb-6 text-sm text-gray-600">
                  If the button doesn&apos;t work, you can copy and paste this
                  link into your browser:
                </Text>

                <Text className="rounded border border-gray-200 bg-gray-50 p-3 text-xs break-all text-gray-500">
                  {resetPasswordLink}
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

ResetPassword.PreviewProps = {
  resetPasswordLink: "https://dreamwebsite.com/reset-password?token=abc123",
} satisfies ResetPasswordProps;

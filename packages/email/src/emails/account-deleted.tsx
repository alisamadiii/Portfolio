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

interface AccountDeletedProps {
  userName?: string;
  feedbackLink?: string;
}

export default function AccountDeleted({
  userName = "there",
  feedbackLink = "https://dreamwebsite.com/feedback",
}: AccountDeletedProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white font-sans text-black">
          <Preview>We&apos;re sorry to see you go - Dream Website</Preview>
          <Container className="mx-auto max-w-2xl p-8">
            <Section className="bg-white">
              <Section className="p-8">
                <Heading className="mb-6 text-2xl font-bold text-black">
                  We&apos;re sorry to see you go
                </Heading>
                <Text className="mb-6 text-base leading-6 text-gray-700">
                  Hi {userName},
                </Text>
                <Text className="mb-6 text-base leading-6 text-gray-700">
                  Your account has been successfully deleted as you requested.
                  We&apos;re genuinely sad to see you leave, and we want you to
                  know that it was a pleasure having you as part of our
                  community.
                </Text>

                <Text className="mb-6 text-base leading-6 text-gray-700">
                  We understand that products don&apos;t always fit
                  everyone&apos;s needs, and that&apos;s okay. If there was
                  something we could have done better, we&apos;d love to hear
                  from you. Your feedback helps us improve for everyone.
                </Text>

                <Section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <Link
                    href={feedbackLink}
                    className="inline-block rounded-lg bg-black px-8 py-3 text-base font-semibold text-white no-underline"
                  >
                    Share Your Feedback
                  </Link>
                </Section>

                <Section className="mb-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-6">
                  <Text className="mb-2 text-sm font-semibold text-black">
                    What happens now?
                  </Text>
                  <Text className="mb-2 text-sm text-gray-700">
                    • Your account and personal data have been permanently
                    deleted
                  </Text>
                  <Text className="mb-2 text-sm text-gray-700">
                    • Any active subscriptions have been cancelled
                  </Text>
                  <Text className="mb-2 text-sm text-gray-700">
                    • You might receive some emails from us
                  </Text>
                  <Text className="text-sm text-gray-700">
                    • You&apos;re welcome to create a new account anytime if you
                    change your mind
                  </Text>
                </Section>

                <Text className="mb-6 text-base leading-6 text-gray-700">
                  If you ever want to come back, we&apos;ll be here with open
                  arms. You can create a new account anytime at{" "}
                  <Link
                    href="https://dreamwebsite.com/signup"
                    className="text-black underline"
                  >
                    dreamwebsite.com
                  </Link>
                  .
                </Text>

                <Text className="mb-6 text-base leading-6 text-gray-700">
                  Thank you for giving us a try. We wish you all the best in
                  your future endeavors.
                </Text>

                <Text className="text-base leading-6 text-gray-700">
                  Take care,
                  <br />
                  The Dream Website Team
                </Text>
              </Section>

              <Section className="border-t border-gray-200 p-8">
                <Text className="text-xs text-gray-500">
                  This is a confirmation email sent by Dream Website regarding
                  your account deletion. If you didn&apos;t request this, please
                  contact our support team immediately. View our{" "}
                  <Link href="/privacy" className="text-black underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" className="text-black underline">
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

AccountDeleted.PreviewProps = {
  userName: "John Doe",
  feedbackLink: "https://dreamwebsite.com/feedback",
} satisfies AccountDeletedProps;

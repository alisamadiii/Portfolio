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

interface MagicLinkProps {
  magicLinkUrl?: string;
}

export default function MagicLink({ magicLinkUrl }: MagicLinkProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>Sign in to your account</Preview>
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
                  Sign in to your account
                </Heading>
                <Text className="mb-6 text-base leading-6 text-gray-600">
                  Click the button below to sign in to your Dream Website
                  account. No password needed — this link will log you in
                  securely.
                </Text>

                {/* CTA */}
                <Section className="mb-6 text-center">
                  <Link
                    href={magicLinkUrl}
                    className="inline-block px-8 py-3 text-base font-semibold text-white no-underline"
                    style={{
                      backgroundColor: "#FC8464",
                      borderRadius: "8px",
                      color: "#ffffff",
                    }}
                  >
                    Sign In
                  </Link>
                </Section>

                <Text className="mb-4 text-sm text-gray-500">
                  This link will expire in 5 minutes for your security.
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
                  {magicLinkUrl}
                </Text>
              </Section>

              {/* Footer inside card */}
              <Section
                className="px-10 py-6"
                style={{ borderTop: "1px solid #f0f0f0" }}
              >
                <Text className="mb-2 text-xs text-gray-400">
                  If you didn&apos;t request this sign-in link, you can safely
                  ignore this email.
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
              <Text
                className="m-0 text-xs"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                &copy; {new Date().getFullYear()} Dream Website · AliSamadii.LLC
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

MagicLink.PreviewProps = {
  magicLinkUrl: "https://dreamwebsite.com/api/auth/magic-link/verify?token=abc123",
} satisfies MagicLinkProps;

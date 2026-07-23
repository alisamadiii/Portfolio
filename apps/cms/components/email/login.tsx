import * as React from "react";
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

import { emailTheme } from "@/components/email/theme";

export const LoginEmailTemplate = ({
  email,
  otp,
  preview = "Sign in to Pages CMS",
}: {
  email: string;
  otp: string;
  preview?: string;
}) => {
  const baseUrl = process.env.BASE_URL
    ? process.env.BASE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          className="mx-auto my-auto px-2 font-sans antialiased"
          style={{
            backgroundColor: emailTheme.background,
            color: emailTheme.foreground,
          }}
        >
          <Container className="mx-auto my-[40px] max-w-[465px] p-[20px]">
            <Section className="mt-[24px]">
              <Img
                src={`${baseUrl}/images/email-logo.png`}
                width="42"
                height="42"
                alt="Pages CMS"
                className="mx-auto my-0"
              />
            </Section>
            <Heading
              className="mx-0 my-[30px] p-0 text-center text-[24px] font-semibold tracking-tight"
              style={{ color: emailTheme.foreground }}
            >
              Sign in to Pages CMS
            </Heading>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              Enter this temporary verification code to continue:
            </Text>
            <Section className="mt-[24px] mb-[24px] text-center">
              <pre
                className="inline-block rounded-lg border-0 text-[28px] font-medium"
                style={{
                  backgroundColor: emailTheme.muted,
                  color: emailTheme.foreground,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  letterSpacing: "8px",
                  lineHeight: 1,
                  marginBottom: 0,
                  marginTop: 0,
                  padding: "12px 4px 12px 12px",
                }}
              >
                {otp}
              </pre>
            </Section>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              This code will expire in 5 minutes.
            </Text>
            <Text
              className="mt-[36px] text-[14px] leading-[24px]"
              style={{ color: emailTheme.mutedForeground }}
            >
              This email was intended for{" "}
              <Link
                href={`mailto:${email}`}
                className="underline"
                style={{ color: emailTheme.mutedLink }}
              >
                {email}
              </Link>
              . If you didn&apos;t try to sign in, you can safely ignore this
              email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

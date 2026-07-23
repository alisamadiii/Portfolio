import * as React from "react";
import {
  Body,
  Button,
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

export const CollaboratorAddedEmailTemplate = ({
  email,
  repoName,
  repoUrl,
  invitedByName,
  invitedByUrl,
}: {
  email: string;
  repoName: string;
  repoUrl: string;
  invitedByName: string;
  invitedByUrl: string;
}) => {
  const baseUrl = process.env.BASE_URL
    ? process.env.BASE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "";

  return (
    <Html>
      <Head />
      <Preview>You were added to &quot;{repoName}&quot; on Pages CMS</Preview>
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
              You were added to &quot;{repoName}&quot;
            </Heading>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              <Link
                href={invitedByUrl}
                className="rounded-md underline"
                style={{ color: emailTheme.link }}
              >
                {invitedByName}
              </Link>{" "}
              added you to the &quot;{repoName}&quot; project on Pages CMS. You
              already have access, so there is nothing to accept.
            </Text>
            <Section className="mt-[24px] mb-[24px] text-center">
              <Button
                className="rounded-lg px-5 py-3 text-center text-[14px] font-medium no-underline"
                href={repoUrl}
                style={{
                  backgroundColor: emailTheme.buttonBackground,
                  border: `1px solid ${emailTheme.buttonBorder}`,
                  color: emailTheme.buttonForeground,
                }}
              >
                Open &quot;{repoName}&quot;
              </Button>
            </Section>
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
              .
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

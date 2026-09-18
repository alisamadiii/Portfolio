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

// Email-safe equivalents of the hub's light theme tokens. Email clients can't
// rely on CSS variables or OKLCH, so these are resolved to hex here.
const emailTheme = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  mutedForeground: "#737373",
  link: "#0a0a0a",
  mutedLink: "#737373",
  buttonBackground: "#009869",
  buttonForeground: "#edfdf5",
  buttonBorder: "#009869",
} as const;

export const CollaboratorInviteEmail = ({
  email,
  repoName,
  inviteUrl,
  invitedByName,
  invitedByUrl,
  baseUrl,
}: {
  email: string;
  repoName: string;
  inviteUrl: string;
  invitedByName: string;
  invitedByUrl: string;
  baseUrl: string;
}) => {
  return (
    <Html>
      <Head />
      <Preview>
        {invitedByName} invited you to &quot;{repoName}&quot;
      </Preview>
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
                alt="Client Hub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading
              className="mx-0 my-[30px] p-0 text-center text-[24px] font-semibold tracking-tight"
              style={{ color: emailTheme.foreground }}
            >
              Join &quot;{repoName}&quot; on Client Hub
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
              has invited you to the &quot;{repoName}&quot; project on Client
              Hub. Use the following link to start collaborating:
            </Text>
            <Section className="mt-[24px] mb-[24px] text-center">
              <Button
                className="rounded-lg px-5 py-3 text-center text-[14px] font-medium no-underline"
                href={inviteUrl}
                style={{
                  backgroundColor: emailTheme.buttonBackground,
                  border: `1px solid ${emailTheme.buttonBorder}`,
                  color: emailTheme.buttonForeground,
                }}
              >
                Join &quot;{repoName}&quot;
              </Button>
            </Section>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              or copy and paste this URL into your browser:{" "}
            </Text>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              <Link
                href={inviteUrl}
                className="rounded-md underline"
                style={{ color: emailTheme.link }}
              >
                {inviteUrl}
              </Link>
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
              . If you think this is a mistake, you can safely ignore this
              email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CollaboratorInviteEmail;

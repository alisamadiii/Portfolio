import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  button,
  buttonSection,
  container,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  mutedText,
  paragraph,
  strong,
  subheading,
  textLink,
  urlBox,
} from "./components/shared";

interface CollaboratorInviteProps {
  email?: string;
  repoName?: string;
  inviteUrl?: string;
  invitedByName?: string;
  invitedByUrl?: string;
}

export default function CollaboratorInviteEmail({
  email,
  repoName,
  inviteUrl,
  invitedByName,
  invitedByUrl,
}: CollaboratorInviteProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${invitedByName} invited you to "${repoName}"`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Join &quot;{repoName}&quot;</Heading>
          <Text style={subheading}>
            You have been invited to collaborate
          </Text>

          <Text style={paragraph}>
            <Link href={invitedByUrl} style={textLink}>
              {invitedByName}
            </Link>{" "}
            invited you to the <span style={strong}>&quot;{repoName}&quot;</span>{" "}
            project on Client Hub. Accept the invitation to start editing and
            publishing content.
          </Text>

          <Section style={buttonSection}>
            <Button href={inviteUrl} style={button}>
              Accept invitation
            </Button>
          </Section>

          <Text style={mutedText}>
            If the button doesn&apos;t work, copy and paste this link:
          </Text>
          <Text style={urlBox}>{inviteUrl}</Text>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            This email was intended for {email}. If you weren&apos;t expecting
            it, you can safely ignore it.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

CollaboratorInviteEmail.PreviewProps = {
  email: "jane@example.com",
  repoName: "acme/website",
  inviteUrl: "https://hub.alisamadii.com/sign-in/collaborator?token=abc123",
  invitedByName: "Ali Samadii",
  invitedByUrl: "https://hub.alisamadii.com",
} satisfies CollaboratorInviteProps;

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
} from "./components/shared";

interface CollaboratorAddedProps {
  email?: string;
  repoName?: string;
  repoUrl?: string;
  invitedByName?: string;
  invitedByUrl?: string;
}

export default function CollaboratorAddedEmail({
  email,
  repoName,
  repoUrl,
  invitedByName,
  invitedByUrl,
}: CollaboratorAddedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You were added to "${repoName}" on Client Hub`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>
            You were added to &quot;{repoName}&quot;
          </Heading>
          <Text style={subheading}>You already have access</Text>

          <Text style={paragraph}>
            <Link href={invitedByUrl} style={textLink}>
              {invitedByName}
            </Link>{" "}
            added you to the <span style={strong}>&quot;{repoName}&quot;</span>{" "}
            project on Client Hub. You already have access — there&apos;s
            nothing to accept.
          </Text>

          <Section style={buttonSection}>
            <Button href={repoUrl} style={button}>
              Open project
            </Button>
          </Section>

          <Text style={{ ...mutedText, margin: "24px 0 0" }}>
            This email was intended for {email}.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

CollaboratorAddedEmail.PreviewProps = {
  email: "jane@example.com",
  repoName: "acme/website",
  repoUrl: "https://hub.alisamadii.com/website",
  invitedByName: "Ali Samadii",
  invitedByUrl: "https://hub.alisamadii.com",
} satisfies CollaboratorAddedProps;

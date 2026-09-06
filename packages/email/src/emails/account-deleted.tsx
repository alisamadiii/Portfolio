import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
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
  hr,
  label,
  main,
  mutedText,
  paragraph,
  strong,
  subheading,
  textLink,
} from "./components/shared";

interface AccountDeletedProps {
  userName?: string;
  feedbackLink?: string;
}

export default function AccountDeleted({
  userName = "there",
  feedbackLink = "https://www.alisamadii.com/feedback",
}: AccountDeletedProps) {
  return (
    <Html>
      <Head />
      <Preview>We&apos;re sorry to see you go - Dream Website</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>We&apos;re sorry to see you go</Heading>
          <Text style={subheading}>Your account has been deleted</Text>

          <Text style={paragraph}>
            Hi <span style={strong}>{userName}</span>,
          </Text>
          <Text style={paragraph}>
            Your account has been successfully deleted as you requested.
            We&apos;re genuinely sad to see you leave, and it was a pleasure
            having you as part of our community.
          </Text>
          <Text style={paragraph}>
            If there was something we could have done better, we&apos;d love to
            hear from you — your feedback helps us improve for everyone.
          </Text>

          <Section style={buttonSection}>
            <Button href={feedbackLink} style={button}>
              Share Your Feedback
            </Button>
          </Section>

          <Text style={{ ...label, margin: "0 0 8px" }}>What happens now?</Text>
          <Text style={bullet}>
            &bull; Your account and personal data have been permanently deleted
          </Text>
          <Text style={bullet}>
            &bull; Any active subscriptions have been cancelled
          </Text>
          <Text style={bullet}>
            &bull; You might receive some emails from us
          </Text>
          <Text style={{ ...bullet, margin: "0 0 24px" }}>
            &bull; You&apos;re welcome to create a new account anytime if you
            change your mind
          </Text>

          <Text style={paragraph}>
            If you ever want to come back, you can create a new account anytime
            at{" "}
            <Link href="https://hub.alisamadii.com/sign-up" style={textLink}>
              alisamadii.com
            </Link>
            .
          </Text>

          <Text style={paragraph}>
            Thank you for giving us a try. We wish you all the best.
          </Text>

          <Text style={{ ...paragraph, margin: 0 }}>
            Take care,
            <br />
            <span style={strong}>The AliSamadii.LLC Team</span>
          </Text>

          <Hr style={hr} />

          <Text style={{ ...mutedText, margin: 0 }}>
            This is a confirmation email sent by AliSamadii.LLC regarding your
            account deletion. If you didn&apos;t request this, contact our
            support team immediately.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

AccountDeleted.PreviewProps = {
  userName: "John Doe",
  feedbackLink: "https://www.alisamadii.com/feedback",
} satisfies AccountDeletedProps;

const bullet: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 4px",
};

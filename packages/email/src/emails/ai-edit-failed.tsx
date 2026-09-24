import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  container,
  EmailFooter,
  EmailHeader,
  heading,
  main,
  mutedText,
  paragraph,
  strong,
  subheading,
} from "./components/shared";

interface AiEditFailedProps {
  recipientName?: string;
  owner?: string;
  repo?: string;
  prompt?: string;
  error?: string;
  status?: "rejected" | "failed";
  jobId?: number;
}

const quote = {
  margin: "8px 0 20px",
  padding: "12px 16px",
  borderLeft: "3px solid #e5e7eb",
  background: "#f9fafb",
  borderRadius: "4px",
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
} as const;

export default function AiEditFailedEmail({
  recipientName,
  owner,
  repo,
  prompt,
  error,
  status,
  jobId,
}: AiEditFailedProps) {
  const site = owner && repo ? `${owner}/${repo}` : "your site";

  return (
    <Html>
      <Head />
      <Preview>{`Your AI edit on ${site} couldn't be applied`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>Your AI edit couldn&apos;t be applied</Heading>
          <Text style={subheading}>
            {status === "rejected" ? "Change rejected" : "Change failed"}
          </Text>

          <Text style={paragraph}>
            {recipientName ? `Hi ${recipientName}, ` : "Hi, "}the AI edit you
            requested on <span style={strong}>{site}</span> was not applied and
            no changes were made.
          </Text>

          {prompt && (
            <>
              <Text style={{ ...paragraph, margin: "0 0 4px" }}>
                <span style={strong}>What you asked for</span>
              </Text>
              <Text style={quote}>{prompt}</Text>
            </>
          )}

          {error && (
            <>
              <Text style={{ ...paragraph, margin: "0 0 4px" }}>
                <span style={strong}>Why it didn&apos;t apply</span>
              </Text>
              <Text style={quote}>{error}</Text>
            </>
          )}

          <Text style={paragraph}>
            You can try rephrasing your request, or reach out to your developer
            if you need a hand.
          </Text>

          {jobId ? (
            <Section>
              <Text style={{ ...mutedText, margin: "24px 0 0" }}>
                Reference: edit #{jobId}
              </Text>
            </Section>
          ) : null}

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

AiEditFailedEmail.PreviewProps = {
  recipientName: "Jane",
  owner: "acme",
  repo: "website",
  prompt: "Shorten the intro paragraph on the about page to two sentences.",
  error:
    "Couldn't locate the intro paragraph on the about page, so no change was made.",
  status: "failed",
  jobId: 42,
} satisfies AiEditFailedProps;

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
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
  paragraph,
  subheading,
  value,
} from "./components/shared";

interface ReviewFeedbackEmailProps {
  businessName: string;
  rating: number;
  message: string;
  name?: string | null;
  contact?: string | null;
  submittedAt?: string;
  hubUrl: string;
}

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

export default function ReviewFeedbackEmail({
  businessName,
  rating,
  message,
  name,
  contact,
  submittedAt = new Date().toISOString(),
  hubUrl,
}: ReviewFeedbackEmailProps) {
  const who = name || "A customer";
  return (
    <Html>
      <Head />
      <Preview>
        {who} left {String(rating)}-star feedback for {businessName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Heading style={heading}>New private feedback</Heading>
          <Text style={subheading}>
            {who} rated {businessName} {rating} out of 5. It was not posted to Google.
          </Text>

          <Text style={{ ...starsStyle }}>{stars(rating)}</Text>

          <Text style={label}>Feedback</Text>
          <Section style={messageBox}>
            <Text style={{ ...paragraph, margin: 0, whiteSpace: "pre-wrap" }}>{message}</Text>
          </Section>

          {(name || contact) && <Hr style={hr} />}
          {name && (
            <>
              <Text style={{ ...label, margin: "0 0 4px" }}>Name</Text>
              <Text style={value}>{name}</Text>
            </>
          )}
          {contact && (
            <>
              <Text style={label}>Contact</Text>
              <Text style={value}>{contact}</Text>
            </>
          )}

          <Text style={label}>Date</Text>
          <Text style={value}>
            {new Date(submittedAt).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </Text>

          <Section style={buttonSection}>
            <Button href={hubUrl} style={button}>
              Open in Client Hub
            </Button>
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

ReviewFeedbackEmail.templateName = "review-feedback" as const;

ReviewFeedbackEmail.PreviewProps = {
  businessName: "Jax Auto Lab",
  rating: 3,
  message:
    "The repair itself was fine, but I waited almost an hour past my appointment time and nobody told me why.",
  name: "Maria Lopez",
  contact: "maria@example.com",
  submittedAt: "2026-11-15T14:30:00.000Z",
  hubUrl: "https://app.alisamadii.com/p/00000000-0000-0000-0000-000000000000/feedback",
} satisfies ReviewFeedbackEmailProps;

const starsStyle: React.CSSProperties = {
  color: "#fc8464",
  fontSize: "24px",
  letterSpacing: "2px",
  margin: "0 0 16px",
};

const messageBox: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #eaeaea",
  borderRadius: "12px",
  padding: "16px",
};

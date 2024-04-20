import {
  Body,
  Container,
  Head,
  Link,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface NewsletterVerificationProps {
  to: string;
  linkVerification: string;
}

export const NewsletterVerification = ({
  to = "alirs.dev@gmail.com",
  linkVerification = "http://localhost:3001/newsletter/approving",
}: NewsletterVerificationProps) => {
  const previewText = `Newsletter - Verification`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-full rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`https://www.alirezasamadi.com/_next/image?url=%2Fmy-image.jpg&w=256&q=75`}
                width="40"
                height="40"
                alt="Vercel"
                className="mx-auto my-0 rounded-full"
              />
              <Text className="mb-0 text-center font-semibold text-black">
                Ali Reza Samadi
              </Text>
              <Text className="my-0 text-center text-xs text-black/70">
                Web Developer
              </Text>
            </Section>

            <Text className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Newsletter Verification
            </Text>

            <Text className="mb-0">
              to <strong>{to}</strong>
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Newsletter is the one of those option that you will learn new
              things, then join me and learn the things that I am good at
              hahaha. can't wait to see you.
            </Text>

            <Section className="mb-[32px] mt-[32px]">
              <Link
                className="rounded bg-[#000000] px-4 py-2 text-[12px] font-semibold text-white no-underline"
                href={`${linkVerification}?email=${to}`}
              >
                Verify now
              </Link>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              I&apos;m Ali Reza! I&apos;ve got 2+ years of{" "}
              <strong>web dev</strong> experience, mainly focusing on front-end
              magic with <strong>ReactJS</strong>. I&apos;m all about embracing
              new challenges and learning opportunities. Let&apos;s build
              something awesome together!
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NewsletterVerification;

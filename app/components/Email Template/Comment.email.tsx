import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface CommentEmailTemplateProps {
  title: string;
  gmail?: string;
  comment: string;
  blogImage: string;
}

export const CommentEmailTemplate = ({
  title,
  gmail,
  comment,
  blogImage,
}: CommentEmailTemplateProps) => {
  const previewText = `Comment - ${title}`;

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
              <Text className="text-center font-semibold">Ali Reza Samadi</Text>
              <Text className="-mt-4 text-center text-xs">Web Developer</Text>
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Comments
            </Heading>

            {gmail && (
              <Text>
                from <strong>{gmail}</strong>
              </Text>
            )}

            <Text className="-mt-4 text-xs text-muted">{title}</Text>

            <Text className="whitespace-pre-line rounded-xl bg-black/5 p-4 text-[14px] leading-[24px] text-black">
              <span className="text-black/50">Comment</span> - {comment}
            </Text>

            <Section className="mb-[32px] mt-[32px]">
              <Button
                className="rounded bg-[#000000] px-4 py-2 text-[12px] font-semibold text-white no-underline"
                href={""}
              >
                Reply now
              </Button>
            </Section>

            <Section className="my-[32px]">
              <Img src={blogImage} alt={title} className="w-full rounded-xl" />
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

export default CommentEmailTemplate;

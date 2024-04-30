import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface ReplyCommentTemplateProps {
  title: string;
  gmail?: string;
  comment: string;
  reply: string;
  blogImage: string;
  blogLink: string;
}

export const ReplyCommentTemplate = ({
  title,
  gmail,
  comment,
  reply,
  blogImage,
  blogLink,
}: ReplyCommentTemplateProps) => {
  const previewText = `Comment - ${title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-full rounded border border-solid border-[#eaeaea] bg-white p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`https://www.alirezasamadi.com/_next/image?url=%2Fmy-image.jpg&w=256&q=75`}
                width="40"
                height="40"
                alt="Vercel"
                className="mx-auto my-0 rounded-full"
              />
              <Text className="text-center font-semibold text-black">
                Ali Reza Samadi
              </Text>
              <Text className="-mt-4 text-center text-xs text-black">
                Web Developer
              </Text>
            </Section>

            <Text className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Reply Comments
            </Text>

            <Text className="text-black">
              to <strong>{gmail}</strong>
            </Text>

            <Text className="-mt-4 text-xs text-black/70">{title}</Text>

            <Text className="whitespace-pre-line rounded-xl bg-black/5 p-4 text-[14px] leading-[24px] text-black opacity-40">
              <span className="text-black/50">Comment</span> - {comment}
            </Text>

            <Text className="whitespace-pre-line rounded-xl bg-black/5 p-4 text-[14px] leading-[24px] text-black">
              <span className="text-black/50">Reply</span> - {reply}
            </Text>

            <Section className="mb-[32px] mt-[32px]">
              <Button
                className="rounded bg-[#000000] px-4 py-2 text-[12px] font-semibold text-white no-underline"
                href={blogLink}
              >
                Check now
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

export default ReplyCommentTemplate;

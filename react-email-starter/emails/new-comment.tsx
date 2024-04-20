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
  title = "How do I make a Website?",
  gmail = "alirs.dev@gmail.com",
  comment = `I see lots of @developers start coding straightforwardly without having any @designs or plans before coding it. If I don't make any designs and don't build a website step by step, I would get confused and 
  
  I would not know what I'm doing, and easily it ...`,
  blogImage = "https://www.alirezasamadi.com/_next/image?url=https%3A%2F%2Fldxedhzbfnmrovkzozxc.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fblog%2Fhow%2520do%2520I%2520make%2520a%2520website%2FHow%2520do%2520I%2520make%2520a%2520Website_.png&w=1920&q=75",
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
              <Text className="mb-0 text-center font-semibold text-black">
                Ali Reza Samadi
              </Text>
              <Text className="my-0 text-center text-xs text-black/70">
                Web Developer
              </Text>
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Comments
            </Heading>

            {gmail && (
              <Text className="mb-0">
                from <strong>{gmail}</strong>
              </Text>
            )}

            <Text className="mt-1 text-xs text-muted">{title}</Text>

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

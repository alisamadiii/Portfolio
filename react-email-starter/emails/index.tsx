import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VercelInviteUserEmailProps {
  title: string;
  username: string;
  details: string;
  inviteLink: string;
  blogImage: string;
}

export const VercelInviteUserEmail = ({
  title = "How do I make a Website?",
  username = "Ali Reza",
  details = "If I want to start coding and I don't know what I should make or design, I need to think beforehand about the design I want to make. I should put most of my time...",
  inviteLink = "https://www.alirezasamadi.com/blog/How-do-I-make-a-Website",
  blogImage = "https://www.alirezasamadi.com/_next/image?url=https%3A%2F%2Fldxedhzbfnmrovkzozxc.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fblog%2Fhow%2520do%2520I%2520make%2520a%2520website%2FHow%2520do%2520I%2520make%2520a%2520Website_.png&w=1920&q=75",
}: VercelInviteUserEmailProps) => {
  const previewText = `Blog - ${title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`https://www.alirezasamadi.com/_next/image?url=%2Fmy-image.png&w=128&q=75`}
                width="40"
                height="40"
                alt="Vercel"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Read <strong>Blog</strong> on <strong>Website</strong>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Hello <strong>{username}</strong>,
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              {details}
            </Text>
            <Section className="my-[32px]">
              <Img src={blogImage} alt={title} className="w-full rounded-xl" />
            </Section>
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-4 py-2 text-center text-[12px] font-semibold text-white no-underline"
                href={inviteLink}
              >
                Read now
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
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

export default VercelInviteUserEmail;

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ReachOutToClientsProps {
  email: string;
}

const genericNames = ["info", "support", "admin", "contact", "hello", "sales"];

export default function ReachOutToClients({ email }: ReachOutToClientsProps) {
  const formatName = (email: string) => {
    return email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\d+/g, "")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Preview>
            Ali from AliSamadii.LLC — a quick note about your online presence
          </Preview>
          <Container className="mx-auto max-w-2xl px-4 py-10">
            <Section className="mb-8">
              <Heading className="m-0 text-xl font-semibold text-gray-900">
                AliSamadii.LLC
              </Heading>
              <Text className="mt-1 text-sm text-gray-500">
                Web Development & Digital Services · Portland, OR
              </Text>
            </Section>

            <Section className="rounded-lg border border-gray-200 bg-white">
              <Section className="p-8">
                <Text className="mb-6 text-base leading-6 text-gray-700 capitalize">
                  Hi {email},
                </Text>

                <Text className="mb-5 text-base leading-6 text-gray-700">
                  My name is Ali with AliSamadii.LLC, a web development and
                  digital services agency based in Portland, OR. I came across
                  your business and really love what you&apos;re doing —
                  it&apos;s clear you&apos;re passionate about what you offer,
                  and your work speaks for itself.
                </Text>

                <Text className="mb-5 text-base leading-6 text-gray-700">
                  That said, I noticed there may be some opportunities to take
                  your online presence to the next level — whether that&apos;s
                  refreshing your website design, improving load speed, mobile
                  responsiveness, or enhancing the overall user experience to
                  better reflect the quality of your brand.
                </Text>

                <Text className="mb-5 text-base leading-6 text-gray-700">
                  A strong online presence can make a huge difference in
                  attracting new customers and building trust, and I&apos;d love
                  to help make sure your website matches the great work
                  you&apos;re already doing.
                </Text>

                <Text className="mb-6 text-base leading-6 text-gray-700">
                  I specialize in fully managed web solutions where I handle
                  everything from design and development to hosting, domain
                  management, and ongoing updates — so you can focus on what you
                  do best: running your business.
                </Text>

                <Section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Text className="mt-0 mb-0 text-sm font-bold text-gray-600">
                    I&apos;d love to offer a free, no-obligation website review
                    and walk you through how we can help elevate your brand
                    online.
                  </Text>
                </Section>

                <Text className="mb-4 text-base text-gray-700">
                  Feel free to reach out anytime:
                </Text>

                <Section className="mb-6">
                  <Text className="mt-0 mb-2 text-base text-gray-700">
                    <Link
                      href="mailto:agency@alisamadii.com"
                      className="text-black underline"
                    >
                      agency@alisamadii.com
                    </Link>
                  </Text>
                  <Text className="m-0 text-base text-gray-700">
                    <Link
                      href="tel:+19713828969"
                      className="text-black underline"
                    >
                      (971) 382-8969
                    </Link>
                  </Text>
                </Section>

                <Text className="mb-2 text-base text-gray-700">
                  Get to know my work:
                </Text>
                <Section className="mb-6">
                  <Text className="mt-0 mb-2 text-base text-gray-700">
                    <Link
                      href="https://agency.alisamadii.com"
                      className="text-black underline"
                    >
                      agency.alisamadii.com
                    </Link>{" "}
                    — services & how I help businesses
                  </Text>
                  <Text className="m-0 text-base text-gray-700">
                    <Link
                      href="https://alisamadii.com"
                      className="text-black underline"
                    >
                      alisamadii.com
                    </Link>{" "}
                    — my portfolio & projects
                  </Text>
                </Section>

                <Hr className="my-6 border-gray-200" />

                <Text className="mb-1 text-base font-medium text-black">
                  Best,
                </Text>
                <Text className="mb-0 text-base font-semibold text-black">
                  Ali Samadii
                </Text>
                <Text className="mt-0 text-sm text-gray-600">
                  AliSamadii.LLC
                </Text>
              </Section>
            </Section>

            <Section className="mt-6 text-center">
              <Text className="text-xs text-gray-500">
                Portland, OR · Web design, development & managed hosting
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ReachOutToClients.PreviewProps = {
  email: "info@company.com",
} satisfies ReachOutToClientsProps;

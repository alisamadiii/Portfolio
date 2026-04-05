import {
  Body,
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

interface ReachOutToClientsProps {
  email: string;
}

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
        <Body
          className="font-sans"
          style={{ backgroundColor: "#FC8464", margin: 0, padding: 0 }}
        >
          <Preview>
            Ali from AliSamadii.LLC — a quick note about your online presence
          </Preview>
          <Container className="mx-auto max-w-xl py-12 px-4">
            {/* Brand header */}
            <Section className="mb-6 text-center">
              <Img
                src="https://cdn.alisamadii.com/company/logo-white.png"
                width="40"
                height="40"
                alt="Logo"
                style={{ margin: "0 auto", display: "block" }}
              />
              <Text
                className="m-0 mt-2 text-xs"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                Web Development &amp; Digital Services &middot; Portland, OR
              </Text>
            </Section>

            {/* Card */}
            <Section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <Section className="px-10 pt-10 pb-6">
                <Text className="mb-6 text-base leading-6 text-gray-600 capitalize">
                  Hi {email},
                </Text>

                <Text className="mb-5 text-base leading-6 text-gray-600">
                  My name is Ali with AliSamadii.LLC, a web development and
                  digital services agency based in Portland, OR. I came across
                  your business and really love what you&apos;re doing —
                  it&apos;s clear you&apos;re passionate about what you offer,
                  and your work speaks for itself.
                </Text>

                <Text className="mb-5 text-base leading-6 text-gray-600">
                  That said, I noticed there may be some opportunities to take
                  your online presence to the next level — whether that&apos;s
                  refreshing your website design, improving load speed, mobile
                  responsiveness, or enhancing the overall user experience to
                  better reflect the quality of your brand.
                </Text>

                <Text className="mb-5 text-base leading-6 text-gray-600">
                  A strong online presence can make a huge difference in
                  attracting new customers and building trust, and I&apos;d love
                  to help make sure your website matches the great work
                  you&apos;re already doing.
                </Text>

                <Text className="mb-6 text-base leading-6 text-gray-600">
                  I specialize in fully managed web solutions where I handle
                  everything from design and development to hosting, domain
                  management, and ongoing updates — so you can focus on what you
                  do best: running your business.
                </Text>

                {/* Highlight box */}
                <Section
                  className="mb-6 p-5"
                  style={{
                    backgroundColor: "#fff5f2",
                    borderRadius: "8px",
                    borderLeft: "4px solid #FC8464",
                  }}
                >
                  <Text className="m-0 text-sm font-semibold text-gray-700">
                    I&apos;d love to offer a free, no-obligation website review
                    and walk you through how we can help elevate your brand
                    online.
                  </Text>
                </Section>

                <Text className="mb-4 text-base text-gray-600">
                  Feel free to reach out anytime:
                </Text>

                <Section className="mb-6">
                  <Text className="mt-0 mb-2 text-base text-gray-600">
                    <Link
                      href="mailto:agency@alisamadii.com"
                      style={{ color: "#FC8464" }}
                      className="no-underline"
                    >
                      agency@alisamadii.com
                    </Link>
                  </Text>
                  <Text className="m-0 text-base text-gray-600">
                    <Link
                      href="tel:+19713828969"
                      style={{ color: "#FC8464" }}
                      className="no-underline"
                    >
                      (971) 382-8969
                    </Link>
                  </Text>
                </Section>

                <Text className="mb-2 text-base text-gray-600">
                  Get to know my work:
                </Text>
                <Section className="mb-6">
                  <Text className="mt-0 mb-2 text-base text-gray-600">
                    <Link
                      href="https://agency.alisamadii.com"
                      style={{ color: "#FC8464" }}
                      className="no-underline"
                    >
                      agency.alisamadii.com
                    </Link>{" "}
                    — services &amp; how I help businesses
                  </Text>
                  <Text className="m-0 text-base text-gray-600">
                    <Link
                      href="https://alisamadii.com"
                      style={{ color: "#FC8464" }}
                      className="no-underline"
                    >
                      alisamadii.com
                    </Link>{" "}
                    — my portfolio &amp; projects
                  </Text>
                </Section>

                <Hr style={{ borderColor: "#f0f0f0" }} className="my-6" />

                <Text className="mb-1 text-base font-medium text-gray-700">
                  Best,
                </Text>
                <Text className="mb-0 text-base font-semibold" style={{ color: "#111111" }}>
                  Ali Samadii
                </Text>
                <Text className="mt-0 text-sm text-gray-500">
                  AliSamadii.LLC
                </Text>
              </Section>
            </Section>

            {/* Outer footer */}
            <Section className="mt-6 text-center">
              <Text className="m-0 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                Portland, OR &middot; Web design, development &amp; managed hosting
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

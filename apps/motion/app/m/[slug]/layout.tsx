import { Metadata } from "next";
import { animationsMetadata } from "@/animations/metadata";

const SITE_URL = "https://motion.alisamadii.com";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const { slug } = await params;

  const animation = animationsMetadata[slug as keyof typeof animationsMetadata];

  return {
    title: animation?.name,
    description: animation?.description,
    alternates: {
      canonical: `/m/${slug}`,
    },
    openGraph: {
      title: animation?.name,
      description: animation?.description,
      url: `/m/${slug}`,
      images: [animation?.image ?? "/og-image.png"],
    },
  };
}

export default async function ComponentLayout({
  children,
  params,
}: Props & {
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const animation = animationsMetadata[slug as keyof typeof animationsMetadata];

  const jsonLd = animation && {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: animation.name,
    ...(animation.description && { description: animation.description }),
    ...(animation.image && { image: animation.image }),
    url: `${SITE_URL}/m/${slug}`,
    author: { "@id": `${SITE_URL}/#person` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

import { Metadata } from "next";
import { animationsMetadata } from "@/animations/metadata";

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
    openGraph: {
      images: [animation?.image ?? ""],
    },
  };
}

export default function ComponentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

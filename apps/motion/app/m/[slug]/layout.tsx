import { Metadata } from "next";
import { animations } from "@/animations/registry";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const { id } = await params;

  const animation = animations[id as keyof typeof animations];

  // fetch data
  return {
    title: animation.name,
    description: animation.description,
    openGraph: {
      images: [animation.image ?? "", animation.darkImage ?? ""],
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

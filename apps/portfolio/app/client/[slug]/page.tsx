import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Divider } from "@/components/divider";
import { VideoWall } from "@/components/video-wall";
import { clientProjects } from "@/lib/clients";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return clientProjects.map((client) => ({ slug: client.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const client = clientProjects.find((c) => c.slug === slug);

  if (!client) {
    return {};
  }

  const description = `Client work for ${client.name} — product videos and highlights from the project.`;

  return {
    title: client.name,
    description,
    alternates: {
      canonical: `/client/${slug}`,
    },
    openGraph: {
      title: client.name,
      description,
      url: `/client/${slug}`,
    },
  };
}

export default async function ClientPage({ params }: Props) {
  const { slug } = await params;
  const client = clientProjects.find((c) => c.slug === slug);

  if (!client) {
    return notFound();
  }

  return (
    <div className="animate-in fade-in mx-auto min-h-screen max-w-5xl px-4 py-24 duration-300 md:px-8">
      <header className="mx-auto mb-12 flex flex-col items-center">
        <Divider />
        <client.logo className="my-4 w-[200px]" />
        <Divider />
      </header>
      <VideoWall videos={client.videos} />
    </div>
  );
}

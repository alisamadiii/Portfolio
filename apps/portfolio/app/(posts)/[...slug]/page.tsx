import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { buttonVariants } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { generateMetadata as generateSEOMetadata } from "@workspace/ui/lib/seo";

import { source } from "@/lib/source";

import { mdxComponents } from "@/components/mdx";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    return {};
  }

  const doc = page.data;
  const url = `/${slug.join("/")}`;

  return generateSEOMetadata({
    title: doc.title,
    description: doc.description || `Read ${doc.title} on Template`,
    url,
    image: doc.thumbnail,
  });
}

async function PostsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;

  const page = source.getPage(slug);

  if (!page) {
    return notFound();
  }

  // Type assertion to help TypeScript understand the page structure
  const doc = page.data;
  const MDX = doc.body;

  return (
    <div className="px-4">
      <div className="mx-auto max-w-2xl py-24">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            className: "mb-8 -translate-x-4",
          })}
        >
          <ArrowLeftIcon /> Back
        </Link>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold md:text-5xl">{doc.title}</h1>
          {doc.description && (
            <p className="text-muted-foreground text-sm">{doc.description}</p>
          )}
          {doc.thumbnail && (
            <img
              src={doc.thumbnail}
              alt={doc.title ?? ""}
              className="aspect-video w-full rounded-xl object-cover"
            />
          )}
        </div>
        <Separator className="my-8" />
        <MDX components={mdxComponents} />
      </div>
    </div>
  );
}

const Page = ({ params }: { params: Promise<{ slug: string[] }> }) => {
  return (
    <Suspense>
      <PostsPage params={params} />
    </Suspense>
  );
};

export default Page;

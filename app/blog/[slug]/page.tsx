import React from "react";
import { notFound } from "next/navigation";

import { allBlogs } from "@/.contentlayer/generated";
import BlogHeader from "./blogHeader";
import Balancer from "react-wrap-balancer";
import { Metadata } from "next";
import { Mdx } from "@/app/components/MDXContent";

type Props = {
  params: {
    slug: string;
  };
};

type generateMetadataProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: generateMetadataProps): Promise<Metadata> {
  // read route params
  const slug = params.slug;

  const findingBlogs = allBlogs.find((post) => slug === post.slugAsParams);

  if (!findingBlogs) {
    return {};
  }

  return {
    title: {
      default: findingBlogs.title,
      absolute: `${findingBlogs.title} | Blog`,
    },
    openGraph: {
      title: findingBlogs.title,
      description: "will be adding",
      url: "https://www.alirezasamadi.com/",
      images: [
        {
          url: findingBlogs.blogImage,
          width: 800,
          height: 600,
        },
      ],
    },
  };
}
export default function BlogPage({ params }: Props) {
  const findingBlogs = allBlogs.find(
    (post) => params.slug === post.slugAsParams
  );

  if (!findingBlogs) {
    return notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {findingBlogs.isComplete ? (
        <>
          <BlogHeader blog={findingBlogs} />
          <Mdx code={findingBlogs.body.code} />
          {/* <Links blog={findingBlogs} /> */}
        </>
      ) : (
        <div className="relative p-4">
          <BlogHeader blog={findingBlogs} />
          <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center bg-background/50 backdrop-blur">
            <h1 className="text-center text-2xl">In process of Writing...</h1>
          </div>
        </div>
      )}
    </div>
  );
}

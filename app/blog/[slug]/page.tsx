import React from "react";
import { notFound } from "next/navigation";

import { allBlogs } from "@/.contentlayer/generated";
import BlogHeader from "./blogHeader";
import { type Metadata } from "next";
import { Mdx } from "@/app/components/MDXContent";
import CommentForm from "./comment-form";
import Comments from "./comments";
import PageView from "./page-view";

interface Props {
  params: {
    slug: string;
  };
}

interface generateMetadataProps {
  params: { slug: string };
}

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
      <BlogHeader blog={findingBlogs} />
      <Mdx code={findingBlogs.body.code} />
      {/* <Links blog={findingBlogs} /> */}
      <CommentForm slug={params.slug} />
      <Comments slug={params.slug} />
      <PageView slug={params.slug} />
    </div>
  );
}

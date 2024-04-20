import React from "react";
import { notFound } from "next/navigation";

import { allBlogs } from "@/.contentlayer/generated";
import BlogHeader from "./blogHeader";
import { type Metadata } from "next";
import { Mdx } from "@/app/components/MDXContent";
import CommentForm from "./comment-form";
import Comments from "./comments";
import PageView from "./page-view";
// import { getTableOfContents } from "@/app/lib/toc";

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

export default async function BlogPage({ params }: Props) {
  const findingBlogs = allBlogs.find(
    (post) => params.slug === post.slugAsParams
  );

  if (!findingBlogs) {
    return notFound();
  }

  // const toc = await getTableOfContents(findingBlogs.body.raw);

  return (
    <div>
      <BlogHeader blog={findingBlogs} />
      <div className="mb-16 border-b border-border pb-24">
        <Mdx code={findingBlogs.body.code} />
      </div>
      {/* <Links blog={findingBlogs} /> */}
      <CommentForm slug={params.slug} blogImage={findingBlogs.blogImage} />
      <Comments slug={params.slug} />
      <PageView slug={params.slug} />
    </div>
  );
}

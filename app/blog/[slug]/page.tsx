import React from "react";
import { notFound } from "next/navigation";

import { allBlogs } from "@/.contentlayer/generated";
import { Mdx } from "./MDXContent";
import BlogHeader from "./blogHeader";
import Balancer from "react-wrap-balancer";

type Props = {
  params: {
    slug: string;
  };
};

export default function BlogPage({ params }: Props) {
  const findingBlogs = allBlogs.find(
    (post) => params.slug === post._raw.flattenedPath
  );

  if (!findingBlogs) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {findingBlogs.isComplete ? (
        <>
          <BlogHeader blog={findingBlogs} />
          <Mdx code={findingBlogs.body.code} />
        </>
      ) : (
        <div className="relative p-4">
          <BlogHeader blog={findingBlogs} />
          <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center bg-background/50 backdrop-blur">
            <Balancer className="text-xl">In process of Writing...</Balancer>
          </div>
        </div>
      )}
    </div>
  );
}

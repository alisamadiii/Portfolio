import React from "react";
import { notFound } from "next/navigation";

import { allBlogs } from "@/.contentlayer/generated";
import { Mdx } from "./MDXContent";
import BlogHeader from "./blogHeader";

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
      <BlogHeader blog={findingBlogs} />
      <Mdx code={findingBlogs.body.code} />
    </div>
  );
}

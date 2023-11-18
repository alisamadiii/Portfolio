import React from "react";
import { notFound } from "next/navigation";

import { allBlogs } from "@/.contentlayer/generated";
import { Mdx } from "./MDXContent";

type Props = {
  params: {
    slug: string;
  };
};

export default function BlogPage({ params }: Props) {
  const findingPosts = allBlogs.find(
    (post) => params.slug === post._raw.flattenedPath
  );

  if (!findingPosts) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Mdx code={findingPosts.body.code} />
    </div>
  );
}

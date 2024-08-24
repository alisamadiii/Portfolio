import React from "react";

import { allBlogs } from "contentlayer/generated";
import { Mdx } from "@/components/MDXContent";

type Props = {
  params: { blogs: string[] };
};

export default function DocsPage({ params: { blogs } }: Props) {
  const findingGoal = allBlogs.find(
    (post) => `/${blogs.join("/")}` === post.slug
  );

  return findingGoal ? (
    <Mdx code={findingGoal.body.code} />
  ) : (
    <div>NO blogs</div>
  );
}

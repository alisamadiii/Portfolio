import React from "react";

import { allContents } from "contentlayer/generated";
import { Mdx } from "@/components/MDXContent";

type Props = {
  params: { contents: string[] };
};

export default function DocsPage({ params: { contents } }: Props) {
  const findingGoal = allContents.find(
    (post) => `/${contents.join("/")}` === post.slug
  );

  console.log(findingGoal);

  return findingGoal ? (
    <Mdx code={findingGoal.body.code} />
  ) : (
    <div>NO Content</div>
  );
}

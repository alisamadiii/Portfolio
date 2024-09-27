import "../../blog.css";

import React from "react";

import { allBlogs } from "contentlayer/generated";
import { Mdx } from "@/components/MDX/MDXContent.blog";
import Link from "next/link";

type Props = {
  params: { slug: string };
};

export default function DocsPage({ params: { slug } }: Props) {
  const findingGoal = allBlogs.find((post) => slug === post.slugAsParams);

  return findingGoal ? (
    <div className="px-6">
      <div className="max-w-xl mx-auto my-11">
        <Link href="/">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 21V9L12 3L20 9V21H14V14H10V21H4Z" fill="#5D5D5D" />
          </svg>
        </Link>
      </div>
      <Mdx code={findingGoal.body.code} />
      <div className="max-w-xl mx-auto my-11">
        <Link href="/">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 21V9L12 3L20 9V21H14V14H10V21H4Z" fill="#5D5D5D" />
          </svg>
        </Link>
      </div>
    </div>
  ) : (
    <div>NO DOCS</div>
  );
}

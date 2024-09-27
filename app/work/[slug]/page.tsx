import "../../blog.css";

import React from "react";
import Link from "next/link";

import { allWorks } from "contentlayer/generated";
import { Mdx } from "@/components/MDX/MDXContent.work";
import { notFound } from "next/navigation";

type Props = {
  params: { slug: string };
};

export default function DocsPage({ params: { slug } }: Props) {
  const findingGoal = allWorks.find((post) => slug === post.slugAsParams);

  if (!findingGoal) {
    return notFound();
  }

  return (
    <div className="px-6 pb-24">
      <div className="max-w-3xl mx-auto my-11 items-center flex gap-6">
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
        <div className="flex gap-4">
          <span className="text-natural-700">
            {String(Number(slug)).padStart(2, "0")}
          </span>{" "}
          <span>/</span> <span>{String(allWorks.length).padStart(2, "0")}</span>
        </div>
      </div>
      <Mdx code={findingGoal.body.code} />
    </div>
  );
}

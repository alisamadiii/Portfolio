import "../../blog.css";

import React from "react";
import Link from "next/link";

import { allWorks } from "contentlayer/generated";
import { Mdx } from "@/components/MDX/MDXContent.work";
import { notFound } from "next/navigation";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return allWorks.map((post) => ({
    slug: post.slugAsParams,
  }));
}

export default function DocsPage({ params: { slug } }: Props) {
  const findingGoal = allWorks.find((post) => slug === post.slugAsParams);

  if (!findingGoal) {
    return notFound();
  }

  return (
    <div className="px-6 pb-24">
      <div className="mx-auto my-11 flex max-w-3xl items-center gap-6">
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
        <div className="flex gap-4 tabular-nums">
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

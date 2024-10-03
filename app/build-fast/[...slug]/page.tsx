import "../../blog.css";

import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allBuildFasts } from "contentlayer/generated";

import { Mdx } from "@/components/MDX/MDXContent.blog";
import Navbar from "./Navbar";
import Menu from "./Menu";

type Props = {
  params: { slug: string[] };
};
export async function generateStaticParams() {
  return allBuildFasts.map((post) => ({
    slug: post.slugAsParams.split("/"),
  }));
}

export async function generateMetadata({ params }: Props) {
  const findingGoal = allBuildFasts.find(
    (post) => params.slug.join("/") === post.slugAsParams
  );

  return {
    title: findingGoal?.title,
  };
}

export default function DocsPage({ params: { slug } }: Props) {
  const findingGoal = allBuildFasts.find(
    (post) => slug.join("/") === post.slugAsParams
  );

  if (!findingGoal) {
    return notFound();
  }

  return (
    <div className="px-6">
      <Navbar slug={slug.join("/")} />
      <div className="mx-auto my-11 flex max-w-xl items-center justify-between">
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
        <Menu slug={slug.join("/")} />
      </div>
      <Mdx code={findingGoal.body.code} />
      <div className="mx-auto my-11 max-w-xl">
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
  );
}

import React from "react";
import Link from "next/link";

import { allTwitterContents } from "contentlayer/generated";
import { Mdx } from "@/components/MDX/MDXContent.work";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return allTwitterContents.map((post) => ({
    slug: post.slugAsParams,
  }));
}

export async function generateMetadata({ params }: Props) {
  const findingGoal = allTwitterContents.find(
    (post) => params.slug === post.slugAsParams
  );

  return {
    title: findingGoal?.title,
  };
}

export default function DocsPage({ params: { slug } }: Props) {
  const findingGoal = allTwitterContents.find(
    (post) => slug === post.slugAsParams
  );

  if (!findingGoal) {
    return notFound();
  }

  return (
    <>
      <div className="pointer-events-none fixed left-0 top-0 h-full w-full select-none">
        <div className="mx-auto h-full w-full max-w-[780px] border-x-2 border-dashed border-natural-200"></div>
      </div>
      <div className="mx-auto my-11 flex max-w-3xl items-center gap-6 px-6 md:px-0">
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
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-4 tabular-nums">
            <span className="text-natural-700">
              {String(Number(slug)).padStart(2, "0")}
            </span>{" "}
            <span>/</span>{" "}
            <span>{String(allTwitterContents.length).padStart(2, "0")}</span>
            {findingGoal.tech && (
              <Badge className="uppercase">{findingGoal.tech}</Badge>
            )}
          </div>
          <div>
            <Button
              variant={"ghost"}
              className="h-8 w-8 p-0"
              disabled={Number(slug) === 1}
            >
              <Link href={`/twitter-content/${Number(slug) - 1}`}>
                <ChevronLeft />
              </Link>
            </Button>
            <Button
              variant={"ghost"}
              className="h-8 w-8 p-0"
              disabled={Number(slug) === allTwitterContents.length}
            >
              <Link href={`/twitter-content/${Number(slug) + 1}`}>
                <ChevronRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="px-8 pb-48 md:px-0">
        <Mdx code={findingGoal.body.code} />
      </div>
    </>
  );
}

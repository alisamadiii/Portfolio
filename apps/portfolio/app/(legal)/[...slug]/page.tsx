"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { MDXContent } from "@content-collections/mdx/react";
import { allLegals } from "content-collections";
import { ArrowLeftIcon } from "lucide-react";

import { buttonVariants } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

import { mdxComponents } from "@/components/mdx";

export default function LegalPage() {
  const { slug } = useParams<{ slug: string[] }>();
  const page = allLegals.find((p) => p._meta.path === slug.join("/"));

  if (!page) {
    return notFound();
  }

  return (
    <div className="px-4">
      <div className="mx-auto max-w-2xl py-24">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            className: "mb-8 -translate-x-4",
          })}
        >
          <ArrowLeftIcon /> Back
        </Link>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold md:text-5xl">{page.title}</h1>
          {page.description && (
            <p className="text-muted-foreground text-sm">{page.description}</p>
          )}
        </div>
        <Separator className="my-8" />
        <MDXContent code={page.mdx} components={mdxComponents} />
      </div>
    </div>
  );
}

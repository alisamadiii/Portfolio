"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { MDXContent } from "@content-collections/mdx/react";
import { allPosts } from "content-collections";
import { ArrowLeftIcon } from "lucide-react";

import { buttonVariants } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

import { mdxComponents } from "@/components/mdx";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = allPosts.find((p) => p._meta.path === slug);

  if (!post) {
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
          <h1 className="text-3xl font-bold md:text-5xl">{post.title}</h1>
          {post.description && (
            <p className="text-muted-foreground text-sm">{post.description}</p>
          )}
          {post.thumbnail && (
            <img
              src={post.thumbnail}
              alt={post.title ?? ""}
              className="aspect-video w-full rounded-xl object-cover"
            />
          )}
        </div>
        <Separator className="my-8" />
        <MDXContent code={post.mdx} components={mdxComponents} />
      </div>
    </div>
  );
}

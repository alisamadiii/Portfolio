"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { allBlogs } from "contentlayer/generated";

export default function ChangingDocs() {
  const { blogs } = useParams<{ blogs: string[] }>();

  const docsIndx = allBlogs.findIndex(
    (doc) => doc.slug === `/${blogs.join("/")}`
  );

  return (
    <div className="mt-8 flex justify-between border-t-wrapper pt-6 text-muted">
      {allBlogs[docsIndx - 1] && (
        <Link
          href={allBlogs[docsIndx - 1].slug}
          className="flex flex-col gap-1 hover:text-foreground"
        >
          <span className="text-sm">Previous</span>
          {allBlogs[docsIndx - 1].title}
        </Link>
      )}
      {allBlogs[docsIndx + 1] && (
        <Link
          href={allBlogs[docsIndx + 1].slug}
          className="ml-auto flex flex-col items-end gap-1 hover:text-foreground"
        >
          <span className="text-sm">Next</span>
          {allBlogs[docsIndx + 1].title}
        </Link>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { allBuildFasts } from "contentlayer/generated";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
};

const folders = ["ui", "react-libraries"];

export default function Navbar({ slug }: Props) {
  return (
    <div className="fixed left-0 top-0 z-50 hidden h-full w-56 flex-col border-r bg-natural-150 p-2 text-sm lg:flex">
      {allBuildFasts
        .filter((post) => post.folder === "build-fast")
        .sort((a, b) => {
          if (!a.order && !b.order) return 0;
          if (!a.order) return 1;
          if (!b.order) return -1;
          return Number(a.order) - Number(b.order);
        })
        .map((post) => (
          <Link
            href={`/build-fast/${post.slugAsParams}`}
            key={post.slugAsParams}
            className={cn("rounded-md p-1 last-of-type:mb-4", {
              "bg-natural-200": post.slugAsParams === slug,
            })}
          >
            {post.title}
          </Link>
        ))}

      {folders.map((folder) => (
        <div key={folder} className="mb-4 flex flex-col gap-1">
          <span className="text-sm capitalize text-natural-500">
            {folder.replace("-", " ")}
          </span>
          {allBuildFasts
            .filter((post) => post.folder === folder)
            .map((post) => (
              <Link
                href={`/build-fast/${post.slugAsParams}`}
                key={post.slugAsParams}
                className={cn("rounded-md p-1", {
                  "bg-natural-200": post.slugAsParams === slug,
                })}
              >
                {post.title}
              </Link>
            ))}
        </div>
      ))}
    </div>
  );
}

"use client";

import React, { Suspense, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { compareDesc, format, parseISO } from "date-fns";

import { allBlogs } from "contentlayer/generated";
import Badge from "../components/badge";
import ViewCount from "./ViewCount";

export default function BlogLinks() {
  const [isNew, setIsNew] = useState(true);

  const blogs = allBlogs
    .sort((a, b) =>
      isNew
        ? compareDesc(new Date(a.publishAt), new Date(b.publishAt))
        : compareDesc(new Date(b.publishAt), new Date(a.publishAt))
    )
    .sort((a: any, b: any) => b.isComplete - a.isComplete);

  return (
    <>
      <button
        className={`mb-4 self-start rounded border border-border px-2 py-1 ${
          isNew ? "bg-foreground text-background" : ""
        }`}
        onClick={() => {
          setIsNew(!isNew);
        }}
      >
        New
      </button>
      <ul className="flex flex-col">
        {blogs.map((blog) => (
          <motion.li key={blog.publishAt} layoutId={blog.publishAt}>
            <Link
              href={`${blog.slug}`}
              className="flex w-full justify-between border-b border-b-transparent py-2 outline-none focus:border-foreground"
              style={{ opacity: blog.isComplete ? 1 : 0.5 }}
            >
              <div className="flex flex-col">
                <p>{blog.title}</p>
                <small className="text-muted-2">
                  {format(parseISO(blog.publishAt), "LLLL d, yyyy")}
                </small>
                {!blog.isComplete && <Badge>Not Completed</Badge>}
              </div>
              {blog.isComplete && (
                <Suspense
                  fallback={
                    <div className="text-sm text-muted">loading...</div>
                  }
                >
                  <ViewCount slug={blog.slugAsParams} />
                </Suspense>
              )}
            </Link>
          </motion.li>
        ))}
      </ul>
    </>
  );
}

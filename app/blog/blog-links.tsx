"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { compareDesc, format, parseISO } from "date-fns";

import { allBlogs } from "contentlayer/generated";
import Badge from "../components/badge";

type Props = {};

export default function BlogLinks({}: Props) {
  const [isNew, setIsNew] = useState(true);

  const blogs = allBlogs.sort((a, b) =>
    isNew
      ? compareDesc(new Date(a.publishAt), new Date(b.publishAt))
      : compareDesc(new Date(b.publishAt), new Date(a.publishAt))
  );

  return (
    <>
      <button
        className={`mb-4 self-start rounded border border-border px-2 py-1 ${
          isNew ? "bg-foreground text-background" : ""
        }`}
        onClick={() => setIsNew(!isNew)}
      >
        New
      </button>
      <ul className="flex flex-col">
        {blogs.map((blog) => (
          <motion.li key={blog.publishAt} layoutId={blog.publishAt}>
            <Link
              href={`${blog.slug}`}
              className="flex w-full flex-col border-b border-b-transparent py-2 outline-none focus:border-foreground"
            >
              <p>{blog.title}</p>
              <small className="text-muted-2">
                {format(parseISO(blog.publishAt), "LLLL d, yyyy")}
              </small>
              {!blog.isComplete && <Badge>Not Completed</Badge>}
            </Link>
          </motion.li>
        ))}
      </ul>
    </>
  );
}

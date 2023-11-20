"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { compareDesc, format, parseISO } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/select";
import { allBlogs } from "contentlayer/generated";
import Badge from "../components/badge";

type Props = {};

export default function BlogLinks({}: Props) {
  const [statics, setStatics] = useState<"new" | "old">("new");

  const blogs = allBlogs.sort((a, b) =>
    statics === "new"
      ? compareDesc(new Date(a.publishAt), new Date(b.publishAt))
      : compareDesc(new Date(b.publishAt), new Date(a.publishAt))
  );

  return (
    <>
      <div className="mb-5">
        <Select onValueChange={(value) => setStatics(value)} defaultValue="new">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="old">Old</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <motion.ul layout className="flex flex-col">
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
      </motion.ul>
    </>
  );
}

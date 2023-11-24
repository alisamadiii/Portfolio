"use client";

import { type Blog } from "@/.contentlayer/generated";
import Image from "next/image";
import React, { useRef } from "react";
import readingTime from "reading-time";
import { motion, useScroll, useTransform } from "framer-motion";
import { format, parseISO } from "date-fns";
import Balancer from "react-wrap-balancer";

interface Props {
  blog: Blog;
}

function formatDate(date: string) {
  const currentDate = new Date();
  const targetDate = new Date(date);

  const yearsAgo = currentDate.getFullYear() - targetDate.getFullYear();
  const monthsAgo = currentDate.getMonth() - targetDate.getMonth();
  const daysAgo = currentDate.getDate() - targetDate.getDate();

  let formattedDate = "";

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}y ago`;
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}mo ago`;
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`;
  } else {
    formattedDate = "Today";
  }

  // const fullDate = targetDate.toLocaleString("en-us", {
  //   month: "long",
  //   day: "numeric",
  //   year: "numeric",
  // });

  return `${formattedDate}`;
}

export default function BlogHeader({ blog }: Props) {
  const blogHeaderRef = useRef<null | HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: blogHeaderRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <header>
      <div className="relative" ref={blogHeaderRef}>
        <Image
          src={blog.blogImage}
          width={1600}
          height={840}
          alt={blog.title}
        />
        {blog.keyboard && (
          <motion.aside
            style={{ opacity }}
            className="absolute bottom-0 left-0 flex w-full items-center justify-between pb-2 pr-3"
          >
            <div className="flex items-center divide-x-2 divide-border">
              {blog.keyboard.map((key, index) => (
                <p key={index} className="px-3 text-sm">
                  {key}
                </p>
              ))}
            </div>
            <p className="text-xs text-muted-2">
              {readingTime(blog.body.raw).text}
            </p>
          </motion.aside>
        )}
      </div>
      <div className="mt-4 flex flex-col">
        <Balancer className="text-3xl font-bold">{blog.title}</Balancer>
        <small className="text-muted-2">
          {format(parseISO(blog.publishAt), "LLLL d, yyyy")} (
          {formatDate(blog.publishAt)})
        </small>
      </div>
    </header>
  );
}

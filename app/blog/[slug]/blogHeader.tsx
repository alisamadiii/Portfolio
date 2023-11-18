"use client";

import { Blog } from "@/.contentlayer/generated";
import Image from "next/image";
import React, { useRef } from "react";
import readingTime from "reading-time";
import { motion, useScroll, useTransform } from "framer-motion";

type Props = {
  blog: Blog;
};

export default function BlogHeader({ blog }: Props) {
  const blogHeaderRef = useRef<null | HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: blogHeaderRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div className="relative" ref={blogHeaderRef}>
      <Image src={blog.blogImage} width={1600} height={840} alt={blog.title} />
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
  );
}

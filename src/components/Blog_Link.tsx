import Image from "next/image";
import Link from "next/link";
import React from "react";
import readingTime from "reading-time";
import formatDistance from "date-fns/formatDistance";
import slugify from "@sindresorhus/slugify";

import { FiArrowUpRight } from "react-icons/fi";

type Props = {
  blogs_data: {
    data: {
      title: string;
      description: string;
      tags: string[];
      image: string;
      author: string;
      createdAt: string;
    };
    blogContent: any;
  };
};

export default function Blog_Link({ blogs_data }: Props) {
  const stats = readingTime(blogs_data.blogContent);

  const timeFormat = (date: string) => {
    return formatDistance(new Date(date), new Date());
  }; // yyyy/mm/dd

  return (
    <Link
      href={`/blog/${slugify(blogs_data.data.title)}`}
      className="relative flex flex-col overflow-hidden font-medium duration-150 bg-white group md:gap-8 md:items-center md:flex-row rounded-xl shadow-container"
    >
      <Image
        src={blogs_data.data.image}
        width={1000}
        height={700}
        alt=""
        className="w-full md:max-w-[300px]"
      />
      <div className="p-4 space-y-3 md:p-0">
        <h3 className="text-xl font-bold md:text-2xl">
          {blogs_data.data.title}
        </h3>
        <p className="text-sm md:text-base">{blogs_data.data.description}</p>
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <div>
            {blogs_data.data.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block px-3 py-1 rounded-md bg-warning/10 text-warning"
              >
                {tag}
              </span>
            ))}
          </div>
          <small>{timeFormat(blogs_data.data.createdAt)}</small>
          <small>{stats.text}</small>
        </div>
      </div>
      <div className="absolute text-6xl duration-300 opacity-0 -translate-y-1/3 right-8 top-1/2 group-hover:opacity-100 group-hover:-translate-y-1/2">
        <FiArrowUpRight />
      </div>
    </Link>
  );
}

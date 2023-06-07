import Image from "next/image";
import Link from "next/link";
import React from "react";
import readingTime from "reading-time";
import formatDistance from "date-fns/formatDistance";
import slugify from "@sindresorhus/slugify";

import { DATA_Type } from "@/Types/Blogs";

type Props = {
  blog: {
    data: DATA_Type;
    blogContent: any;
  };
};

export default function Blog_Link({ blog }: Props) {
  const durationForReading = readingTime(blog.blogContent); // EX. 4 minutes

  const timeFormat = (date: string) => {
    return formatDistance(new Date(date), new Date());
  }; // yyyy/mm/dd

  const { title, image, description } = blog.data;

  return (
    <Link
      href={`blog/${slugify(title)}`}
      className="relative p-[2px] isolate overflow-hidden duration-200 rounded-xl bg-light-blue before:absolute before:inset-0 before:bg-gradient-to-tr before:from-primary before:to-secondary before:-z-10 before:animate-spin before:opacity-0 hover:before:opacity-100 before:duration-200"
    >
      <div className="bg-light-blue rounded-xl">
        <Image
          src={image}
          width={1000}
          height={700}
          alt={`image from - ${title}`}
          className="rounded-xl"
        />
        <div className="px-2 pb-2">
          <h2 className="mt-2 mb-1 text-2xl font-bold tracking-tight">
            {title}
          </h2>
          <p>{description}</p>
        </div>
      </div>
    </Link>
  );
}

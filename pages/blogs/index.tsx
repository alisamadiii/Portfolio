import HeadTag from "@/components/Head";
import React from "react";
import fs from "fs";
import path from "path";
import formatDistance from "date-fns/formatDistance";

import { fileNames, pathFiles } from "@/utils/MDXFiles";
import matter from "gray-matter";
import Link from "next/link";

type Props = {
  blogs: {
    data: {
      title: string;
      bio: string;
      published: string;
      banner: string;
      order: number;
    };
    fileName: string;
  }[];
};

export default function Blogs({ blogs }: Props) {
  const sortingBlogs = blogs.sort((a, b) => {
    return a.data.order - b.data.order;
  });

  const timeFormat = (date: string) => {
    return formatDistance(new Date(date), new Date());
  };

  return (
    <>
      <HeadTag title="Blogs" />
      <div className="mt-6">
        {sortingBlogs.map((d) => (
          <Link
            key={d.data.order}
            href={`/blogs/${d.fileName.replace(".mdx", "")}`}
            className="space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <h1 className="text-2xl font-bold tracking-tight">
                {d.data.title}
              </h1>
              <p className="text-sm opacity-70">
                {timeFormat(d.data.published)}
              </p>
            </div>
            <p>{d.data.bio}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export const getStaticProps = async () => {
  const blogs = fileNames.map((fileName) => {
    const content = fs.readFileSync(path.join(pathFiles, fileName));
    const { data } = matter(content);
    return {
      data,
      fileName,
    };
  });
  return {
    props: {
      blogs,
    },
  };
};

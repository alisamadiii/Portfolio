import Image from "next/image";
import React from "react";

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
  return (
    <div className="flex flex-col overflow-hidden font-medium duration-150 bg-white hover:-translate-y-1 md:gap-8 md:items-center md:flex-row rounded-xl shadow-container">
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
          <small>3 months ago</small>
        </div>
      </div>
    </div>
  );
}

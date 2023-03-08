import HeadTag from "@/components/Head";
import { fileNames, pathFiles } from "@/utils/MDXFiles";
import path from "path";
import React from "react";
import fs from "fs";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import rehypeHighlight from "rehype-highlight";
import rehypeCodeTitles from "rehype-code-titles";
import { Components } from "@/components/blogs/MDXComponents";
import confetti from "canvas-confetti";

import "highlight.js/styles/agate.css";
import Image from "next/image";

type Props = {
  mdxSource: any;
  data: {
    title: string;
    banner: string;
    bio: string;
    published: string;
    order: number;
  };
};

export default function Slug({ mdxSource, data }: Props) {
  const onClickHandler = () => {
    confetti();
  };
  return (
    <>
      <HeadTag title="Testimonial" />
      <div className="mt-6" id="content">
        <div className="py-8 border-b-2 border-gray-400">
          <Image
            src={data.banner}
            width={1000}
            height={400}
            alt=""
            className="object-cover border-none aspect-banner !my-0"
          />
          <h1 className="mt-8 mb-4 text-3xl font-black text-center md:text-4xl">
            {data.title}
          </h1>
          <p className="text-sm text-center md:text-xl">{data.bio}</p>
          <p className="mt-3 text-center opacity-70">{data.published}</p>
        </div>
        <div className="mt-8">
          <MDXRemote {...mdxSource} components={Components}></MDXRemote>
        </div>
        <button
          onClick={onClickHandler}
          className="px-4 py-2 font-sans rounded-md bg-slate-300 dark:bg-slate-800"
        >
          Was it helpful?
        </button>
      </div>
    </>
  );
}

export const getStaticProps = async ({ params }: any) => {
  const { slug } = params;

  const filePath = path.join(pathFiles, `${slug}.mdx`);
  const readFile = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(readFile);
  const mdxSource = await serialize(content, {
    mdxOptions: {
      rehypePlugins: [rehypeCodeTitles, rehypeHighlight],
    },
  });

  return {
    props: {
      data,
      mdxSource,
    },
  };
};

export const getStaticPaths = () => {
  const blogsPath = fileNames.map((slug) => {
    return {
      params: {
        slug: slug.replace(".mdx", ""),
      },
    };
  });

  return {
    paths: blogsPath,
    fallback: false,
  };
};

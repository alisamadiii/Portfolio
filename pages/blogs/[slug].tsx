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

type Props = {
  mdxSource: any;
};

export default function Slug({ mdxSource }: Props) {
  return (
    <>
      <HeadTag title="Testimonial" />
      <div className="mt-6" id="content">
        <MDXRemote {...mdxSource} components={Components}></MDXRemote>
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

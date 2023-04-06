import React from "react";
import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import { Heading1 } from "@/components";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";

type Props = {
  data: any;
  mdxSource: any;
};

export default function Slug({ data, mdxSource }: Props) {
  console.log(data);
  return (
    <div className="mt-24 max-w-[1200px] mx-auto">
      {/* <Heading1 className="py-4">{data.title}</Heading1> */}
      <div>
        <MDXRemote {...mdxSource} />
      </div>
    </div>
  );
}

export const getServerSideProps = async (context: any) => {
  const { slug } = context.query;
  const singleBlogPathFiles = path.join(process.cwd(), `src/blog/${slug}.mdx`);
  const singleBlogFileName = fs.readFileSync(singleBlogPathFiles);
  const { data, content } = matter(singleBlogFileName);
  const mdxSource = await serialize(content, {
    scope: {},
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings, rehypePrism],
      format: "mdx",
    },
    parseFrontmatter: false,
  });

  return {
    props: {
      data,
      mdxSource,
    },
  };
};

import React, { useEffect, useState } from "react";
import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";
import rehypeCodeTitles from "rehype-code-titles";

import { Components } from "@/components/Blog Styles/MDXCompnents";
import Arrow from "@/assets/Arrow";
import { AnimatePresence } from "framer-motion";
import Meta_Tag from "@/layout/Head";
import { AiOutlineConsoleSql } from "react-icons/ai";
import WorkingIllustration from "@/assets/Working_Illustration";
import { Heading1, Heading2 } from "@/components";

type Props = {
  data: any;
  mdxSource: any;
  writing: boolean;
};

export default function Slug({ data, mdxSource, writing }: Props) {
  const [visible, setVisible] = useState<boolean>(false);
  useEffect(() => {
    document.addEventListener("scroll", (e) => {
      const value = window.scrollY;
      value >= 300 ? setVisible(true) : setVisible(false);
    });
  }, []);

  return (
    <>
      <Meta_Tag title={data.title} description={data.description} />
      <div className="mt-24 max-w-[700px] mx-auto px-4" id="back-to-top">
        {/* <Heading1 className="py-4">{data.title}</Heading1> */}
        <div id="mdx">
          <MDXRemote {...mdxSource} components={Components} />
        </div>
        {writing && (
          <>
            <Heading2>Writing...</Heading2>
            <p className="inline-block px-2 py-1 text-xs text-white rounded-md bg-dark-blue">
              Coming Soon
            </p>
            <WorkingIllustration />
          </>
        )}
        {writing == false && (
          <div className="flex flex-col items-center gap-3 mt-12">
            <h2 className="text-xl font-bold">Was it Helpful?</h2>
            <div className="flex gap-2 text-3xl">
              <p className="duration-200 cursor-pointer grayscale hover:grayscale-0 hover:scale-105">
                😩
              </p>
              <p className="duration-200 cursor-pointer grayscale hover:grayscale-0 hover:scale-105">
                😀
              </p>
              <p className="duration-200 cursor-pointer grayscale hover:grayscale-0 hover:scale-105">
                🤩
              </p>
            </div>
          </div>
        )}
        <AnimatePresence>{visible && <Arrow />}</AnimatePresence>
      </div>
    </>
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
      rehypePlugins: [
        rehypeSlug,
        rehypeAutolinkHeadings,
        rehypeCodeTitles,
        rehypePrism,
      ],
      format: "mdx",
    },
    parseFrontmatter: false,
  });

  console.log(content.length);

  return {
    props: {
      data,
      mdxSource,
      writing: content.length == 0 ? true : false,
    },
  };
};

import React, { useEffect, useState } from "react";
import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { motion } from "framer-motion";
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
import WorkingIllustration from "@/assets/Working_Illustration";
import { Heading2 } from "@/components";

// Icons
import { IoIosArrowDown } from "react-icons/io";

type Props = {
  data: any;
  mdxSource: any;
  writing: boolean;
};

// Fonts
import { Bebas_Neue } from "next/font/google";

const bebas = Bebas_Neue({
  weight: ["400"],
  display: "swap",
  subsets: ["latin"],
});

export default function Slug({ data, mdxSource, writing }: Props) {
  const [visible, setVisible] = useState<boolean>(false);
  const [headingElements, setHeadingElements] = useState<any>(null);
  const [isTableContent, setIsTableContent] = useState<boolean>(false);

  useEffect(() => {
    document.addEventListener("scroll", (e) => {
      const value = window.scrollY;
      value >= 300 ? setVisible(true) : setVisible(false);
    });
  }, []);

  useEffect(() => {
    const headings = document.querySelectorAll("h1, h2, h3, h4");
    setHeadingElements(headings);
  }, []);

  return (
    <>
      <Meta_Tag title={data.title} description={data.description} />
      <div className="mt-24 max-w-[700px] mx-auto px-4" id="back-to-top">
        {/* <Heading1 className="py-4">{data.title}</Heading1> */}
        <div id="mdx">
          <div className="relative p-4 border rounded-lg shadow-lg bg-white/10">
            <div className="absolute top-0 left-0 bg-primary/20 h-52 w-96 blur-3xl -z-10"></div>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsTableContent(!isTableContent)}
            >
              <p className={`${bebas.className} text-3xl font-black`}>
                Table Of Content
              </p>
              <IoIosArrowDown
                className={`duration-200 ${isTableContent && "rotate-180"}`}
              />
            </div>
            <AnimatePresence>
              {isTableContent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: { type: "spring" },
                  }}
                  exit={{ height: 0 }}
                  className="flex flex-col gap-1 overflow-hidden"
                >
                  {headingElements &&
                    [...headingElements].map((heading, index) => (
                      <a
                        key={index}
                        href={`#${heading.id}`}
                        className="px-2 duration-100 rounded-md hover:bg-gray-200"
                      >
                        {heading.textContent}
                      </a>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            <p className="text-xl font-bold">Was it Helpful?</p>
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

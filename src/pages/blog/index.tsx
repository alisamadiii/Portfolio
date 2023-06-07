import Container from "@/layout/Container";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import path from "path";
import fs from "fs";
import matter from "gray-matter";
import slugify from "@sindresorhus/slugify";

import Meta_Tag from "@/layout/Head";

type Props = {
  blogs: {
    data: DATA_Type;
    blogContent: any;
  }[];
};

// Images
import My_Journey_Image from "../../assets/blog-my-journey-2.jpg";
import { DATA_Type } from "@/Types/Blogs";
import { Blog_Link } from "@/components";

export default function Blogs({ blogs }: Props) {
  return (
    <>
      <Meta_Tag
        title="Blogs"
        description="This page is specifically dedicated to blogs."
      />
      <Container className="relative mt-24">
        <div className="absolute top-0 w-96 h-96 bg-primary/30 -z-10 blur-3xl animate-spin"></div>
        {/* WHOAMI */}
        <header className="grid items-center gap-4 p-4 overflow-hidden border md:grid-cols-2 bg-light-blue-2/50 rounded-xl backdrop-blur-md before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-12 before:bg-light-blue/10 before:animate-skeleton-effect before:z-20 before:pointer-events-none">
          <div className="order-2 w-full md:px-6 lg:px-12 md:order-1">
            <p className="inline-block px-4 py-1 text-xs text-white rounded-md bg-dark-blue">
              Who am I?
            </p>
            <h1 className="text-2xl font-medium tracking-tight lg:text-3xl">
              Passionate coder & creator of animated content. Skilled in
              Next.js, Framer-Motion & TailwindCSS.
            </h1>
            <Link
              href={"/blog/my-journey"}
              className="inline-block px-4 py-2 mt-4 font-medium text-white duration-150 rounded-md bg-gradient-to-tr from-primary to-secondary hover:scale-95"
            >
              Read More
            </Link>
          </div>
          <div className="relative order-1 p-2 overflow-hidden shadow-sm bg-light-blue rounded-xl md:order-2 isolate">
            <Image
              src={My_Journey_Image}
              width={1000}
              height={300}
              alt=""
              className="object-cover aspect-video rounded-xl"
            />
            <div className="absolute left-0 w-full h-24 bottom-1/2 bg-gradient-to-b from-transparent via-primary/20 to-transparent -z-10" />
          </div>
        </header>

        <div className="mt-8 mb-6 space-y-2">
          <h2 className="text-4xl font-bold">Blogs</h2>
          <p>This section is specifically dedicated to blogs. </p>
        </div>

        {/* Blogs */}
        <section className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <Blog_Link key={blog.data.blog} blog={blog} />
          ))}
        </section>
      </Container>
    </>
  );
}

export async function getStaticProps() {
  const blogPathFiles = path.join(process.cwd(), "src/blog");
  const fileNames = fs.readdirSync(blogPathFiles);

  const blogs = fileNames
    .map((name) => {
      const content = fs.readFileSync(`${blogPathFiles}/${name}`);
      const { data, content: blogContent } = matter(content);

      return {
        data,
        blogContent,
      };
    })
    .sort((a, b) => {
      return a.data.blog - b.data.blog;
    })
    .filter((blogs) => blogs.data.isVisible == true);

  return {
    props: {
      blogs,
    },
  };
}

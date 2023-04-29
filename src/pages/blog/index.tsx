import Container from "@/layout/Container";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import path from "path";
import fs from "fs";
import matter from "gray-matter";
import slugify from "@sindresorhus/slugify";

type Props = {
  blogs: {
    data: {
      blog: number;
      title: string;
      description: string;
      tags: string[];
      image: string;
      author: string;
      createdAt: string;
    };
    blogContent: any;
  }[];
};

// Images
import My_Journey_Image from "../../assets/blog-my-journey.jpg";

export default function Blogs({ blogs }: Props) {
  return (
    <Container className="mt-24">
      <header className="grid items-center gap-4 p-4 md:grid-cols-2 bg-light-blue-2 rounded-xl">
        <div className="order-2 w-full md:px-6 lg:px-12 md:order-1">
          <p>How am I?</p>
          <h1 className="text-2xl font-medium tracking-tight lg:text-3xl">
            Passionate coder & creator of animated content. Skilled in Next.js,
            Framer-Motion & TailwindCSS.
          </h1>
          <Link
            href={"/blog/my-journey"}
            className="inline-block px-4 py-2 mt-4 font-medium text-white duration-150 rounded-md bg-gradient-to-tr from-primary to-secondary hover:scale-95"
          >
            Read More
          </Link>
        </div>
        <div className="order-1 p-2 shadow-sm bg-light-blue rounded-xl md:order-2">
          <Image
            src={My_Journey_Image}
            width={1000}
            height={300}
            alt=""
            className="object-cover aspect-video rounded-xl"
          />
        </div>
      </header>

      <div className="mt-8 mb-6 space-y-2">
        <h2 className="text-4xl font-bold">Blogs</h2>
        <p>This section is specifically dedicated to blogs. </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {blogs.map((blog) => (
          <Link
            key={blog.data.blog}
            href={`blog/${slugify(blog.data.title)}`}
            className="pb-3 duration-200 hover:bg-light-blue-2 rounded-b-xl hover:scale-[.98]"
          >
            <Image
              src={blog.data.image}
              width={1000}
              height={700}
              alt={`image from - ${blog.data.title}`}
              className="rounded-lg"
            />
            <h2 className="mt-2 mb-1 text-2xl font-bold tracking-tight">
              {blog.data.title}
            </h2>
            <p>{blog.data.description}</p>
          </Link>
        ))}
      </section>
    </Container>
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

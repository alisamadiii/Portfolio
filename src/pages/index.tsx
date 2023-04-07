import React from "react";
import path from "path";
import fs from "fs";
import matter from "gray-matter";

import { PROJECTS } from "@/contents/Projects";

import Container from "@/layout/Container";
import { Heading2, Project, Blog_Link } from "@/components";
import { Hero, About } from "@/container";
import { PRODUCTS } from "@/contents/Products";
import Product from "@/components/Product";

type Props = {
  blogs: {
    blogs_data: {
      data: {
        title: string;
        author: string;
        createdAt: string;
      };
      blogContent: any;
    };
  }[];
};

export default function Home({ blogs }: Props) {
  return (
    <>
      <main>
        {/* Header */}
        <header className="relative w-full py-56">
          <Hero />
        </header>

        {/* About */}
        <section id="about" className="py-12">
          <About />
        </section>

        {/* Projects */}
        <section id="projects" className="relative py-12">
          <Container className="space-y-12">
            <Heading2>Projects</Heading2>
            <div className="grid gap-4 md:grid-cols-2">
              {PROJECTS.map((project) => (
                <Project key={project.id} project={project} />
              ))}
            </div>
          </Container>
        </section>

        {/* Blogs */}
        <section id="blogs" className="py-12">
          <Container className="space-y-12">
            <Heading2>Blogs</Heading2>
            <div className="space-y-5">
              {blogs.map((blog) => (
                // @ts-ignore-start
                <Blog_Link key={blog.data.blog} blogs_data={blog} />
                // @ts-ignore-end
              ))}
            </div>
          </Container>
        </section>

        {/* Products */}
        <section id="products" className="py-12">
          <Container className="space-y-12">
            <Heading2>Products</Heading2>
            <div className="space-y-5">
              {PRODUCTS.map((product) => (
                <Product key={product.product} product={product} />
              ))}
            </div>
          </Container>
        </section>

        {/* Testimonial */}
        <section id="testimonial" className="py-12">
          <Container className="space-y-12">
            <Heading2>Testimonial</Heading2>
          </Container>
        </section>
      </main>
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
    });

  return {
    props: {
      blogs,
    },
  };
}

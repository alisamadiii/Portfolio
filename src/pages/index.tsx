import React from "react";
import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { motion } from "framer-motion";

import { PROJECTS } from "@/contents/Projects";

import Container from "@/layout/Container";
import { Heading2, Project, Blog_Link } from "@/components";
import { Hero, About } from "@/container";
import { PRODUCTS } from "@/contents/Products";
import Product from "@/components/Product";
import Meta_Tag from "@/layout/Head";

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

export default function Home({ blogs }: Props) {
  return (
    <>
      <Meta_Tag
        title="Ali Reza | Portfolio"
        description="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
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
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  key={project.id}
                >
                  <Project project={project} />
                </motion.div>
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
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  key={blog.data.blog}
                >
                  <Blog_Link blogs_data={blog} />
                </motion.div>
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
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  key={product.product}
                >
                  <Product product={product} />
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Testimonial */}
        <section id="testimonial" className="py-12">
          <Container className="space-y-12">
            <Heading2>Testimonial</Heading2>
            <h2 className="text-3xl text-center animate-pulse">
              Coming soon...
            </h2>
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

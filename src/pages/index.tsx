import React from "react";
import { motion } from "framer-motion";

import { PROJECTS } from "@/contents/Projects";

import Container from "@/layout/Container";
import { Heading2, Project } from "@/components";
import { Hero, About } from "@/container";
import { PRODUCTS } from "@/contents/Products";
import Product from "@/components/Product";
import Meta_Tag from "@/layout/Head";
import { DAILY_APPLICATIONS } from "@/contents/Daily_Applications";
import Each_Applications from "@/components/Each_Applications";

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

export default function Home({}: Props) {
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

        {/* Application */}
        <section className="relative py-12">
          <Container className="space-y-12">
            <Heading2>Daily Applications</Heading2>
            <small className="italic">Hover on each Items *</small>
            <div className="flex flex-wrap items-start gap-8">
              {DAILY_APPLICATIONS.map((app) => {
                return <Each_Applications key={app.app} app={app} />;
              })}
            </div>
          </Container>
        </section>

        {/* Projects */}
        <section id="projects" className="relative py-12">
          <Container className="space-y-12">
            <Heading2>Projects</Heading2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PROJECTS.map((project) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  key={project.id}
                  className={`${project.id == 1 && "lg:col-span-2"}`}
                >
                  <Project project={project} />
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Products */}
        <section id="products" className="py-12">
          <Container className="space-y-12">
            <Heading2>Products</Heading2>
            <div className="flex flex-wrap items-start gap-4">
              {PRODUCTS.map((product) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  key={product.product}
                  className="basis-[300px] grow rounded-3xl shadow-lg border overflow-hidden"
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

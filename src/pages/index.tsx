import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  const [heroBackground, setHeroBackground] = useState<boolean>(true);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      const { scrollY } = window;

      scrollY > 100 ? setHeroBackground(false) : setHeroBackground(true);
    });
  }, []);

  return (
    <>
      <Meta_Tag
        title="Ali Reza | Portfolio"
        description="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
      <main>
        {/* Header */}
        <header className="relative z-20 w-full py-60">
          <AnimatePresence>
            {heroBackground && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-center bg-cover -z-20 bg-hero-background"
              />
            )}
          </AnimatePresence>
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
            <div className="flex flex-wrap gap-4">
              {PROJECTS.map((project) => (
                <Project key={project.id} project={project} />
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

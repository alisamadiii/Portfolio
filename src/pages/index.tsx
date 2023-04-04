import React from "react";
import path from "path";
import fs from "fs";

import { PROJECTS } from "@/contents/Projects";

import Container from "@/layout/Container";
import { Heading2, Project, Blog_Link } from "@/components";
import { Hero, About } from "@/container";

export default function Home() {
  return (
    <>
      <main>
        {/* Header */}
        <header className="relative w-full py-56 overflow-x-hidden">
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
          <Container>
            <Heading2>Blogs</Heading2>
            <Blog_Link />
          </Container>
        </section>

        {/* Testimonial */}
        <section id="testimonial">
          <Container>
            <Heading2>Testimonial</Heading2>
          </Container>
        </section>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const blogPathFiles = path.join(process.cwd(), "blog");

  return {
    props: {
      blogs: "working",
    }, // will be passed to the page component as props
  };
}

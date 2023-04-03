import React, { useState, useContext, useEffect } from "react";
import { useInView } from "react-intersection-observer";

import { Navbar_Context } from "@/context/Navbar_Context";
import Container from "@/layout/Container";
import { DropDown_List, Heading1, Heading2, Project } from "@/components";
import { AnimatePresence } from "framer-motion";
import { PROJECTS } from "@/contents/Projects";

import { FiChevronDown } from "react-icons/fi";
import { LINKS } from "@/contents/Links";

import MyImage from "@/assets/my image.png";
import Image from "next/image";

export default function Home() {
  const [isMenu, setIsMenu] = useState<boolean>(false);
  const { setIsButton } = useContext(Navbar_Context);

  const { ref, inView } = useInView();

  useEffect(() => {
    inView == true ? setIsButton(false) : setIsButton(true);
  }, [inView]);

  return (
    <>
      <main>
        {/* Header */}
        <header className="relative w-full py-56 overflow-x-hidden" ref={ref}>
          <div className="scale-x-110 absolute top-0 left-0 w-full h-full -translate-y-[100px] md:rounded-b-[20%] lg:rounded-b-[100%] bg-light-blue-2 -z-50 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-t from-primary to-secondary blur-3xl opacity-30"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-pattern"></div>
          </div>
          <Container className="flex flex-col items-center justify-center gap-8">
            <div></div>
            <Heading1>Ali Reza</Heading1>
            <p className="text-base font-medium text-center md:text-lg">
              I have a strong foundation in HTML, CSS, and JavaScript, and I am
              skilled in creating <br /> interactive and visually appealing
              websites.
            </p>
            <div className="space-y-4">
              <div
                className="w-48 flex items-center justify-between gap-4 px-4 py-2 font-medium duration-150 bg-white border-2 rounded-lg active:!scale-95 cursor-pointer"
                onClick={() => setIsMenu(!isMenu)}
              >
                <span>Menu</span>
                <span className={`${isMenu && "rotate-180"} duration-200`}>
                  <FiChevronDown />
                </span>
              </div>
              <AnimatePresence>
                {isMenu && (
                  <DropDown_List className="absolute w-48" data={LINKS} />
                )}
              </AnimatePresence>
            </div>
          </Container>
        </header>

        {/* About */}
        <section id="about" className="pt-12 pb-40">
          <Container className="space-y-12">
            <Heading2>About</Heading2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">
                  As a front-end developer, I specialize in building and
                  maintaining the user interface of web applications.
                </h3>
                <p className="font-medium">
                  Hi, my name is Ali Reza and I am a web developer with over 2
                  years of experience in the field. I specialize in front-end
                  development and have a strong background in ReactJS. I am
                  always looking to learn and grow as a developer, and I am
                  excited to work on new and challenging projects
                </p>
              </div>
              <div>
                <Image
                  src={MyImage}
                  width={500}
                  height={500}
                  alt="my image"
                  className="mx-auto"
                />
              </div>
            </div>
          </Container>
        </section>

        {/* Projects */}
        <section id="projects" className="relative">
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
        <section id="blogs">
          <Container>
            <Heading2>Blogs</Heading2>
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

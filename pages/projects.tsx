import HeadTag from "@/components/Head";
import React from "react";
import { motion } from "framer-motion";

type Props = {};

export default function Projects({}: Props) {
  return (
    <>
      <HeadTag title="Projects" />
      <motion.div
        className="mt-6 space-y-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <p className="font-bold leading-7">
          Hi everyone, I&apos;d like to showcase some of my recent projects.
          These are projects that I&apos;ve been working on and I&apos;m excited
          to share them with you. Each project demonstrates my skills in
          Front-End & Back-End. I&apos;ve put a lot of effort into each project,
          and I hope you find them interesting and informative.
        </p>
        <a
          href="https://www.anilearn.dev"
          target={"_blank"}
          aria-label="Check out my first project - AniLearn.dev"
          className="inline-block space-y-2"
        >
          <h1 className="text-2xl font-bold" id="project" data-project="#1">
            AniLearn.dev
          </h1>
          <p className="opacity-95">
            We provide the best content to learn something very easily. The
            visual descriptions of development principles that We create are
            very clear.
          </p>
        </a>
        <a
          href="https://asakatsu-website.netlify.app/"
          target={"_blank"}
          aria-label="Check out my second project - Asakatsu"
          className="inline-block space-y-2"
        >
          <h1 className="text-2xl font-bold" id="project" data-project="#2">
            Asakatsu
          </h1>
          <p className="opacity-95">
            A project where you can keep track of your goal&apos;s progress, and
            contribute to open source in the same time.
          </p>
        </a>
      </motion.div>
    </>
  );
}

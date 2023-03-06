import HeadTag from "@/components/Head";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PROJECTS } from "@/contents/Projects";
import Image from "next/image";

type Props = {};

type OneProjectType = {
  project: number;
  name: string;
  description: string;
  banner: string | null;
  tech_stacks: string[];
  started_at: string;
  github: string;
  website: string;
};

export default function Projects({}: Props) {
  const [project, setProject] = useState<null | OneProjectType>(null);

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
        {PROJECTS.map((project: OneProjectType) => (
          <div
            key={project.project}
            className="inline-block space-y-2 cursor-pointer"
            onClick={() => setProject(project)}
          >
            <h1
              className="text-2xl font-bold"
              id="project"
              data-project={`#${project.project}`}
            >
              {project.name}
            </h1>
            <p className="opacity-95">{project.description}</p>
          </div>
        ))}

        <AnimatePresence mode="wait" initial={false}>
          {project && <EachProject project={project} setProject={setProject} />}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

type EachProjectType = {
  project: {
    project: number;
    name: string;
    description: string;
    banner: string | null;
    tech_stacks: string[];
    started_at: string;
    github: string;
    website: string;
  };
  setProject: (a: any) => void;
};

import { AiFillGithub } from "react-icons/ai";
import { BiWorld } from "react-icons/bi";

export const EachProject = ({ project, setProject }: EachProjectType) => {
  return (
    <div className="fixed bottom-0 left-0 z-50 flex flex-col items-center justify-center w-full h-screen isolate">
      <div
        onClick={() => setProject(null)}
        className="absolute top-0 left-0 w-full h-full bg-white dark:bg-black dark:bg-opacity-70 bg-opacity-70 -z-10"
      ></div>
      <motion.div
        {...project_motion}
        className="w-full max-w-[500px] bg-white dark:bg-[#212121] p-4 rounded-md shadow-xl"
      >
        <Image
          src={project.banner || ""}
          width={800}
          height={400}
          className="object-cover rounded-lg aspect-video dark:grayscale-[50%] dark:contrast-125"
          alt={`image - ${project.name}`}
        />
        <h1 className="mt-4 mb-3 text-xl font-bold">{project.name}</h1>
        <p className="text-sm opacity-90">{project.description}</p>
        <div className="flex flex-wrap items-center gap-2 my-4">
          {project.tech_stacks.map((stack, index) => (
            <p
              key={index}
              className="px-4 py-1 bg-gray-300 rounded-md dark:bg-gray-700"
            >
              {stack}
            </p>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-8 text-2xl">
          <a
            href={project.github}
            target={"_blank"}
            aria-label="Github Link"
            className="p-2 duration-150 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <AiFillGithub />
          </a>
          <a
            href={project.website}
            target={"_blank"}
            aria-label="Website Link"
            className="p-2 duration-150 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <BiWorld />
          </a>
        </div>
      </motion.div>
    </div>
  );
};

const project_motion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, y: [100, -20, 0] },
  exit: { opacity: 0, y: [0, -20, 100] },
  transition: { duration: 0.3 },
};

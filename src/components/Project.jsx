import React from "react";
import { motion } from "framer-motion";
import { AiFillGithub } from "react-icons/ai";
import { BiWorld } from "react-icons/bi";

import Badges from "./Badges";

const Project = ({ project }) => {
  return (
    <>
      {project.isDone ? (
        <div className="relative rounded-lg overflow-hidden">
          <div
            className="w-full h-full absolute -z-10 xl:z-10"
            style={{
              background:
                "linear-gradient(rgba(0, 0, 0, 0), rgba(2, 15, 24, 0.64), #052032 100%)",
            }}></div>
          <motion.img
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.5 }}
            src={project.img}
            width={"100%"}
            alt=""
          />
          <div className="xl:absolute bottom-0 left-0 px-4 py-8 space-grotesk z-20">
            <motion.h4
              animate={{ opacity: [0, 1], x: [-100, 10, 0] }}
              transition={{ duration: 1 }}
              className="text-lg lg:text-2xl mb-2">
              {project.name}
            </motion.h4>
            <motion.p
              animate={{ opacity: [0, 1], x: [-100, 10, 0] }}
              transition={{ duration: 1, delay: 0.1 }}
              className="text-xs md:text-base text-light text-opacity-70">
              {project.description}
            </motion.p>

            <motion.div
              animate={{ opacity: [0, 1], x: [-100, 10, 0] }}
              transition={{ duration: 1 }}
              className="flex flex-wrap gap-2 mt-4 lg:mt-2">
              {project.tech_stacks.includes("react") && (
                <Badges technology={"reactjs"} />
              )}
              {project.tech_stacks.includes("tailwind") && (
                <Badges technology={"tailwindcss"} />
              )}
              {project.tech_stacks.includes("firebase") && (
                <Badges technology={"firebase"} />
              )}
            </motion.div>

            <div className="flex justify-end gap-4 mt-2 text-2xl">
              <a href={project.github} target={"_blank"} rel="noreferrer">
                <AiFillGithub />
              </a>
              <a href={project.website} target={"_blank"} rel="noreferrer">
                <BiWorld />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <h1 className="text-center text-3xl font-bold">Under Construction</h1>
      )}
    </>
  );
};

export default Project;

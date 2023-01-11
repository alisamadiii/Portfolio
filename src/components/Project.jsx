import React from "react";
import { motion } from "framer-motion";

const Project = ({ project }) => {
  return (
    <div className="relative rounded-lg overflow-hidden">
      <div
        className="w-full h-full absolute z-10"
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
      <div className="absolute bottom-0 left-0 px-4 py-8 space-grotesk z-20">
        <motion.h4
          animate={{ opacity: [0, 1], x: [-100, 10, 0] }}
          transition={{ duration: 1 }}
          className="text-2xl mb-2">
          {project.name}
        </motion.h4>
        <motion.p
          animate={{ opacity: [0, 1], x: [-100, 10, 0] }}
          transition={{ duration: 1, delay: 0.1 }}
          className="text-light text-opacity-70">
          {project.description}
        </motion.p>
      </div>
    </div>
  );
};

export default Project;

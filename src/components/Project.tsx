import "node_modules/video-react/dist/video-react.css"; // import css

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Player, BigPlayButton, ControlBar, LoadingSpinner } from "video-react";

import { ProjectType } from "@/contents/Projects";

type Props = {
  project: ProjectType;
};

export default function Project({ project }: Props) {
  const { logo } = project;

  if (project.name.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
        className="relative w-full p-4 overflow-hidden bg-center bg-cover border grow sm:grow-0 basis-80 group rounded-xl shadow-container"
      >
        <Image src={logo} width={30} height={30} alt="" />
        <h3 className="mt-2 mb-1 text-lg font-medium">{project.name}</h3>
        <p className="text-sm">{project.description}</p>
        <div className="my-3 overflow-hidden bg-red-800 rounded-lg">
          <Player>
            <source src={project.video} />
            <LoadingSpinner />
            <BigPlayButton position="center" />
            <ControlBar autoHide={true} />
          </Player>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xl">
          {project.links.map((link, index) => {
            const { icon: Icon } = link;

            return (
              <a key={index} href={link.href} target="_blank" title={link.name}>
                <Icon />
              </a>
            );
          })}
        </div>
      </motion.div>
    );
  } else {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.4,
          delay: project.id * 0.05,
          ease: "easeInOut",
        }}
        className="relative flex items-center justify-center w-full p-4 overflow-hidden bg-center bg-cover border grow sm:grow-0 basis-80 group rounded-xl shadow-container"
      >
        <h3 className="text-3xl font-medium opacity-25">Coming...</h3>
      </motion.div>
    );
  }
}

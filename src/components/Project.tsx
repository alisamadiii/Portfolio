import React, { useState } from "react";

import { BiDotsVerticalRounded } from "react-icons/bi";
import { ProjectType } from "@/contents/Projects";
import DropDown_List from "./DropDown_List";
import { AnimatePresence } from "framer-motion";
import Review_Project from "./Review_Project";

type Props = {
  project: ProjectType;
};

export default function Project({ project }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  console.log(isOpen);

  return (
    <div className="relative px-4 py-6 bg-white rounded-xl shadow-container">
      <div className="flex items-center justify-between text-2xl font-bold">
        <h3>{project.name}</h3>
        <div>
          <BiDotsVerticalRounded onClick={() => setIsOpen(!isOpen)} />
          <AnimatePresence>
            {isOpen && (
              <DropDown_List
                data={project.links}
                className="absolute hidden w-48 translate-y-2 md:block right-4"
              />
            )}
            {isOpen && (
              <Review_Project
                key={project.id}
                data={project.links}
                setIsOpen={setIsOpen}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-2 font-medium">{project.description}</p>
    </div>
  );
}

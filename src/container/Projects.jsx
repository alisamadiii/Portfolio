import React, { useState } from "react";

import { PROJECTS } from "../content/Projects";
import { IoMdArrowDropright } from "react-icons/io";

import SectionGradient from "../components/Section-Gradient";
import Project from "../components/Project";

function Projects() {
  const [projectId, setProjectId] = useState(1);

  return (
    <div
      id="about"
      className="relative h-auto lg:h-screen 2xl:h-auto py-12 lg:py-0 2xl:py-24 flex justify-center px-4 lg:px-40 overflow-hidden">
      <SectionGradient />
      <div className="w-full max-w-[1536px] flex flex-col justify-center">
        <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-6">
          Projects
        </h3>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col gap-4 text-2xl">
            <button
              onClick={() => setProjectId(1)}
              className="flex justify-between border-b-2 border-light border-opacity-60 p-2">
              Todo Website <IoMdArrowDropright />
            </button>
            <button
              onClick={() => setProjectId(2)}
              className="flex justify-between border-b-2 border-light border-opacity-60 p-2">
              Asakatsu <IoMdArrowDropright />
            </button>
            <button
              onClick={() => setProjectId(3)}
              className="flex justify-between border-b-2 border-light border-opacity-60 p-2">
              E-Commerce Website <IoMdArrowDropright />
            </button>
          </div>

          {projectId == 1 && <Project project={PROJECTS[0]} />}
          {projectId == 2 && <Project project={PROJECTS[1]} />}
          {projectId == 3 && <Project project={PROJECTS[2]} />}
        </div>
      </div>
    </div>
  );
}

export default Projects;

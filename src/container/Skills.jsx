import React from "react";

import { AiFillHtml5 } from "react-icons/ai";
import { DiCss3 } from "react-icons/di";
import { IoLogoJavascript } from "react-icons/io";
import { FaNode, FaReact } from "react-icons/fa";
import { SiTypescript, SiNextdotjs } from "react-icons/si";

function Skills() {
  return (
    <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-24 mb-24 p-4 text-2xl md:text-5xl text-link text-opacity-50">
      <AiFillHtml5 />
      <DiCss3 />
      <IoLogoJavascript />
      <SiTypescript />
      <FaNode />
      <FaReact />
      <SiNextdotjs />
    </div>
  );
}

export default Skills;

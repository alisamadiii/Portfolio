import React from "react";
import { motion } from "framer-motion";

import { AiFillHtml5 } from "react-icons/ai";
import { DiCss3 } from "react-icons/di";
import { IoLogoJavascript } from "react-icons/io";
import { FaNode, FaReact } from "react-icons/fa";
import { SiTypescript, SiNextdotjs } from "react-icons/si";

const SKILLS = [
  {
    id: 1,
    icon: <AiFillHtml5 />,
  },
  {
    id: 2,
    icon: <DiCss3 />,
  },
  {
    id: 3,
    icon: <IoLogoJavascript />,
  },
  {
    id: 4,
    icon: <SiTypescript />,
  },
  {
    id: 5,
    icon: <FaNode />,
  },
  {
    id: 6,
    icon: <FaReact />,
  },
  {
    id: 7,
    icon: <SiNextdotjs />,
  },
];

function Skills() {
  return (
    <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-24 mb-24 p-4 text-2xl md:text-5xl text-link text-opacity-50">
      {SKILLS.map((skill) => (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.02 * skill.id }}
          viewport={{ once: true }}
          key={skill.id}>
          {skill.icon}
        </motion.div>
      ))}
    </div>
  );
}

export default Skills;

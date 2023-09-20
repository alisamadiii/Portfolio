import React from "react";
import { FaEarthAmericas, FaReact } from "react-icons/fa6";
import { BsVectorPen } from "react-icons/bs";

const ServiceINITIAL_VALUE = [
  {
    id: 1,
    title: "Building Website",
    description: "Crafting captivating, functional websites.",
    icon: React.createElement(FaEarthAmericas),
  },
];

const Experience = [
  {
    id: 1,
    title: "Content Creations",
    subtitle: "X",
    description:
      "I began creating animated content in January 2023, and within one month, I gained 10k followers. My content has been well-received by many people, and I continue to improve it every day.",
    date: "2020",
    icon: React.createElement(FaEarthAmericas),
  },
  {
    id: 2,
    title: "Front-End Developer",
    subtitle: "HTML, CSS & JS",
    description:
      "Like everyone else, I began my journey by learning HTML and CSS. I completed numerous projects using these technologies. Once I felt comfortable with HTML and CSS, I decided to delve into JavaScript. At first, I questioned the purpose of learning JavaScript, but eventually, I discovered its significance.",
    date: "2020 - 2022",
    icon: React.createElement(BsVectorPen),
  },
  {
    id: 3,
    title: "Front-End Developer",
    subtitle: "Figma, Next.js & Framer Motion",
    description:
      "If I want to undertake a massive project, I need to use technologies that will assist me in its development. That's why I decided to learn CSS framework (Tailwindcss) and JavaScript library (Reactjs). I dedicate most of my time to building projects and contributing to open source, as I recognize that these are the most effective ways to improve oneself - by actively creating and collaborating on other people's projects. Additionally, I've started working with Figma because I understand that if I want to work independently or start my own company, having knowledge of UI is crucial. Thankfully, everything is going well so far. Occasionally, I may become frustrated when encountering a bug that takes time to solve, but I am confident that I will find a solution soon.",
    date: "2022 - present",
    icon: React.createElement(FaReact),
  },
];

export { ServiceINITIAL_VALUE, Experience };

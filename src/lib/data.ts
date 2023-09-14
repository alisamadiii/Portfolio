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
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: "2020",
    icon: React.createElement(FaEarthAmericas),
  },
  {
    id: 2,
    title: "Front-End Developer",
    subtitle: "HTML, CSS & JS",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: "2020 - 2022",
    icon: React.createElement(BsVectorPen),
  },
  {
    id: 3,
    title: "Front-End Developer",
    subtitle: "Figma, Next.js & Framer Motion",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: "2022 - present",
    icon: React.createElement(FaReact),
  },
];

export { ServiceINITIAL_VALUE, Experience };

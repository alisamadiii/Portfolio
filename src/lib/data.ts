import React from "react";
import { FaEarthAmericas, FaReact } from "react-icons/fa6";
import { BsVectorPen } from "react-icons/bs";
import { TechnologyType } from "@/types/index.t";

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

const Technologies: TechnologyType[] = [
  {
    id: 1,
    title: "HTML",
    icon: "html",
    description:
      "The HyperText Markup Language or HTML is the standard markup language for documents designed to be displayed in a web browser.",
  },
  {
    id: 2,
    title: "CSS",
    icon: "css",
    description:
      "Cascading Style Sheets (CSS) is a style sheet language used for describing the presentation of a document written in a markup language such as HTML or XML. CSS is a cornerstone technology of the World Wide Web, alongside HTML and JavaScript. ",
  },
  {
    id: 3,
    title: "JavaScript",
    icon: "js",
    description:
      "JavaScript (JS) is a computer programming language used to make websites and applications dynamic and interactive.",
  },
  {
    id: 4,
    title: "Tailwind CSS",
    icon: "tailwind",
    description:
      "A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.",
  },
  {
    id: 5,
    title: "React.js",
    icon: "reactjs",
    description:
      "React lets you build user interfaces out of individual pieces called components. Create your own React components like Thumbnail, LikeButton, and Video. Then combine them into entire screens, pages, and apps.",
  },
  {
    id: 6,
    title: "Next.js",
    icon: "nextjs",
    description:
      "Used by some of the world's largest companies, Next.js enables you to create full-stack Web applications by extending the latest React features, and integrating powerful Rust-based JavaScript tooling for the fastest builds.",
  },
  {
    id: 7,
    title: "Supabase",
    icon: "supabase",
    description: "Supabase is an open source Firebase alternative.",
  },
];

export { ServiceINITIAL_VALUE, Experience, Technologies };

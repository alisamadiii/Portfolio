import { cn } from "@/utils";
import Link from "next/link";
import React from "react";

type Props = {};

const projects = [
  {
    id: 1,
    name: "AniLearn.dev",
    link: "https://www.anilearn.dev/",
    description: "Easy way to learn HTML, CSS, and JavaScript",
    logo: (
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto mb-3"
      >
        <rect
          width="34"
          height="34"
          rx="7.80054"
          fill="url(#paint0_linear_8_135)"
        />
        <path
          d="M17 22.9095H23.6482M20.2325 10.8113C20.5266 10.5172 20.9254 10.352 21.3413 10.352C21.7571 10.352 22.156 10.5172 22.45 10.8113C22.7441 11.1053 22.9093 11.5042 22.9093 11.92C22.9093 12.3359 22.7441 12.7347 22.45 13.0288L13.5784 21.9012C13.4027 22.0769 13.1854 22.2055 12.9468 22.275L10.8253 22.894C10.7617 22.9125 10.6944 22.9136 10.6302 22.8972C10.5661 22.8808 10.5075 22.8474 10.4607 22.8006C10.4139 22.7537 10.3805 22.6952 10.3641 22.6311C10.3477 22.5669 10.3488 22.4995 10.3673 22.436L10.9863 20.3145C11.0559 20.0761 11.1845 19.8592 11.3601 19.6836L20.2325 10.8113Z"
          stroke="white"
          stroke-width="1.06371"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <defs>
          <linearGradient
            id="paint0_linear_8_135"
            x1="17"
            y1="0"
            x2="17"
            y2="34"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stop-color="#4E4E4E" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 2,
    name: "Crosspost",
    link: "",
    description: "This is one of the client's project that I am still working.",
    logo: null,
  },
];

export default function ProjectSection({}: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-start gap-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={project.link}
          className={cn(
            "inline-block grow basis-52 cursor-default rounded-md border-wrapper p-4 text-center duration-200",
            project.link.length > 1 &&
              "cursor-pointer hover:bg-code-figcaption active:bg-background dark:hover:border-white"
          )}
        >
          {project.logo}
          <span>{project.name}</span>
          <span className="mt-1 line-clamp-2 text-sm text-muted">
            {project.description}
          </span>
        </Link>
      ))}
    </div>
  );
}

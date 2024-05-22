import React from "react";

import Image from "next/image";
import TechnologyIcon from "./assets/technology.icon";
import Badge from "../components/badge";
import TextShadow from "../components/text-shadow";
import GlassAnimation from "../components/glass-animation";
import ContentWrapper from "@/components/content-wrapper";

const technologies: Technology[] = ["nextjs", "supabase", "tailwind"];

const clientProjects: ClientProjectsTypes[] = [
  {
    projectId: 1,
    name: "Crosspost",
    clientName: null,
    description: "",
    period: "3 mounts",
    domain: null,
    isDone: false,
  },
];

const personalProjects: PersonalProjectsTypes[] = [
  {
    projectId: 1,
    name: "AniLearn.dev",
    description: "Easy way to learn HTML, CSS, and JavaScript",
    domain: "https://anilearn.dev",
    isWorking: true,
  },
];

export default function Home() {
  return (
    <ContentWrapper>
      <h1 className="text-2xl font-extrabold">
        hey, I&apos;m <TextShadow>Ali Reza</TextShadow> 👋
      </h1>
      {/* <Link href={"/blog/my-story"}>
        <Badge className="mb-8">Hear My Story</Badge>
      </Link> */}
      <p className="mb-5 leading-6 text-muted">
        I&apos;m Ali Reza! I&apos;ve got 2+ years of web dev experience, mainly
        focusing on front-end magic with ReactJS. I&apos;m all about embracing
        new challenges and learning opportunities. Let&apos;s build something
        awesome together!
      </p>
      <p className="leading-6 text-muted">
        I began creating animated content in January 2023, and within one month,
        I gained 10k followers. My content has been well-received by many
        people, and I continue to improve it every day. You can watch some of my
        favourites below.
      </p>
      <div className="relative my-8 overflow-hidden">
        <GlassAnimation />
        <a
          href="https://twitter.com/alirdev"
          target="_blank"
          className="flex w-full items-center gap-4 overflow-hidden rounded border border-border bg-box px-3 py-4 outline-none duration-200 focus:shadow-box-focus"
          rel="noreferrer"
        >
          <div>
            <Image
              src={"/my-image.jpg"}
              width={120}
              height={120}
              alt="my-image"
              className="h-16 w-16 rounded-full object-cover"
            />
          </div>
          <div className="grow">
            <p className="font-semibold">@alirdev</p>
            <p className="text-muted-2">33000 followers</p>
          </div>
          <svg
            height="100%"
            viewBox="0 0 15 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3"
          >
            <path
              d="M12.9282 0.425631L1.68479 1.80615L1.87944 3.39147L10.4083 2.34997L0.461526 15.0812L1.72392 16.0675L11.6707 3.33626L12.7234 11.8637L14.3087 11.6691L12.9282 0.425631Z"
              fill="currentColor"
            />
          </svg>
        </a>
      </div>

      <p className="mb-5 leading-6 text-muted">Main Tech Stacks:</p>
      <div className="flex flex-wrap gap-2">
        {technologies.map((tech, index) => (
          <div
            key={index}
            className="rounded border border-border  bg-box px-3 py-4"
          >
            <TechnologyIcon name={tech} />
          </div>
        ))}
      </div>
      <p className="mb-5 mt-8 leading-6 text-muted">Personal Projects:</p>

      <ul className="list-disc pl-4">
        {personalProjects.map((project, index) => (
          <li key={index}>
            <a href="https://anilearn.dev" target="_blank" rel="noreferrer">
              <h3>{project.name}</h3>
              <p className="text-sm text-muted">{project.description} </p>
            </a>
          </li>
        ))}
      </ul>

      <p className="mb-5 mt-8 leading-6 text-muted">
        <span>Client</span> Projects:
      </p>

      <ul className="list-disc pl-4">
        {clientProjects.map((project, index) => {
          const Element = project.isDone ? "a" : "button";

          return (
            <li key={index}>
              <Element
                href="#"
                className={`flex w-full flex-col ${
                  project.isDone ? "" : "cursor-not-allowed"
                }`}
              >
                <h3 className={`${!project.isDone && "opacity-50"}`}>
                  {project.name}
                </h3>
                <p
                  className={`text-sm text-muted ${
                    !project.isDone && "opacity-50"
                  }`}
                >
                  {project.description}
                </p>
                {!project.isDone && <Badge>My current client</Badge>}
              </Element>
            </li>
          );
        })}
      </ul>
    </ContentWrapper>
  );
}

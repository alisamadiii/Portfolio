"use client";

import Link from "next/link";
import { FileUser } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  BetterAuth,
  Drizzle,
  Motion,
  NextJS,
  Polar,
  Shadcn,
  TailwindCSS,
  TypeScript,
} from "@workspace/ui/icons/tech";
import { company } from "@workspace/ui/lib/company";
import { cn } from "@workspace/ui/lib/utils";

import Apps from "../components/apps";

const skills = [
  {
    name: "NextJS",
    description: "The React framework for production-grade applications",
    icon: NextJS,
  },
  {
    name: "TypeScript",
    description: "A superset of JavaScript that adds static typing",
    icon: TypeScript,
  },
  {
    name: "TailwindCSS",
    description: "A utility-first CSS framework for rapid UI development",
    icon: TailwindCSS,
  },
  {
    name: "Motion",
    description: "A production-ready motion library for React",
    icon: Motion,
  },
  {
    name: "Shadcn UI",
    description:
      "An open source UI component library for building high-quality interfaces",
    icon: Shadcn,
  },
  {
    name: "Drizzle ORM",
    description:
      "A TypeScript ORM for SQL databases with a focus on type safety",
    icon: Drizzle,
  },
  {
    name: "Better Auth",
    description: "A modern authentication library built",
    icon: BetterAuth,
  },
  {
    name: "Polar",
    description: "A platform for selling digital products",
    icon: Polar,
  },
];

const projects = [
  {
    name: "Zuude UI",
    description: "Library of components and animations",
    link: "https://www.zuude-ui.com/",
  },
  {
    name: "NPM Insight",
    description: "A tool to get insights about npm packages",
    link: "https://www.npminsight.com/analytics?packages=next%2Creact",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-20 px-8 pt-20">
      <div className="shadow-dialog mb-8 flex items-center justify-between gap-8 rounded-xl bg-black/90 p-6 text-white backdrop-blur-sm transition-all hover:bg-black/95">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Motion UI</h2>
          <p className="text-sm text-gray-300">
            Explore my collection of animation components and interactive UI
            elements built with Motion.
          </p>
        </div>
        <Link
          href="https://motion.alisamadii.com/"
          className={buttonVariants({
            variant: "outline",
            className: "text-black",
          })}
        >
          Visit
        </Link>
      </div>
      {/* <div className="absolute right-0 top-0 -z-20 h-[100dvh] bg-red-500 opacity-10">
        <video
          src="https://vztpjn0djt.ufs.sh/f/RAHCy45jEybltJ6sRJQSzao8JKyu7h1mvi6bR3WYqeXkUV9Z"
          muted
          autoPlay
          loop
          className="aspect-[3/4] h-full object-cover"
        />
      </div> */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <img
            src={company.myImage}
            alt="Profile picture"
            width={128}
            height={128}
            className="h-24 w-24 rounded-full object-cover"
          />
          <div className="flex">
            {company.social.map(({ icon: Icon, href, label }) => (
              <Link
                href={href}
                key={label}
                className="flex size-8 items-center justify-center"
              >
                <Icon className="size-6" />
              </Link>
            ))}
          </div>
        </div>

        <Badge className="mt-7 text-xs">
          Currently building Motion UI with Motion
        </Badge>

        <div className="mt-2">
          <h1 className="text-3xl md:text-4xl">
            Building <span className="text-primary">Website</span> is My
            Passion!
          </h1>
          <p className="text-natural-700 mt-2 text-lg">
            Hey, I&apos;m Ali! I&apos;ve been working in web development for 5
            years, mainly focusing on frontend and fullstack development with
            ReactJS.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-start gap-1">
          <div className="flex gap-2">
            <a href={`mailto:${company.email}`} className={buttonVariants({})}>
              Let&apos;s collaborate
            </a>
            <Link
              href={company.resume}
              download
              target="_blank"
              className={buttonVariants({
                variant: "outline",
                className: "gap-1",
              })}
            >
              <FileUser size={18} />
              Download CV
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-8 text-sm font-normal tracking-[.3rem] uppercase">
          What I use
        </h2>

        <ul className="relative grid grid-cols-2 items-center justify-items-center">
          <Divider />
          {skills.slice(0, 2).map((skill) => (
            <Skill key={skill.name} skill={skill} />
          ))}
          <Divider />
          {skills.slice(2, 4).map((skill) => (
            <Skill key={skill.name} skill={skill} />
          ))}
          <Divider />
          {skills.slice(4, 6).map((skill) => (
            <Skill key={skill.name} skill={skill} />
          ))}
          <Divider />
          {skills.slice(6, 8).map((skill) => (
            <Skill key={skill.name} skill={skill} />
          ))}
          <Divider />
          <Divider
            borderTop
            className="border-t-none absolute h-[calc(100%+20rem)] w-px translate-x-0 border-l"
          />
          <Divider
            borderTop
            className="border-t-none absolute left-0 h-[calc(100%+20rem)] w-px translate-x-0 border-l"
          />
          <Divider
            borderTop
            className="border-t-none absolute right-0 h-[calc(100%+20rem)] w-px translate-x-0 border-l"
          />
        </ul>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-8 text-sm font-normal tracking-[.3rem] uppercase">
          Projects
        </h2>

        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={project.link}
              target="_blank"
              className="group opacity-80 transition hover:opacity-100"
            >
              <h3 className="mb-1 font-sans text-xl group-hover:underline">
                {project.name}
              </h3>
              <p className="text-natural-700">{project.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-8 text-sm font-normal tracking-[.3rem] uppercase">
          The App/Website I&apos;m using
        </h2>

        <Apps />
      </section>

      {/* <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          Blogs
        </Text>

        <div className="flex flex-col gap-4">
          {allBlogs
            .filter((blog) => !blog.hidden)
            .map((blog) => (
              <Link
                key={blog._id}
                href={`/blog/${blog.slugAsParams}`}
                className="group opacity-80 transition hover:opacity-100"
              >
                <Text
                  element="h3"
                  variant="h3"
                  className="mb-1 font-sans text-xl group-hover:underline"
                >
                  {blog.title}
                </Text>
                <Text variant="p2-r" className="text-natural-700">
                  {blog.description}
                </Text>
              </Link>
            ))}
        </div>
      </section> */}

      {/* <TwitterContents /> */}
      {/* <Works /> */}

      {/* <section className="my-20">
        <h2 className="text-muted-foreground mb-8 text-sm font-normal tracking-[.3rem] uppercase">
          Random Stuff
        </h2>

        <div className="flex flex-col gap-4">
          <Link
            href={`https://github.com/NowShip`}
            target="_blank"
            className="group opacity-80 transition hover:opacity-100"
          >
            <h3 className="mb-1 font-sans text-xl group-hover:underline">
              Ship Now Organization
            </h3>
            <p className="text-natural-700">
              I created this organization to help me build projects quickly,
              since previously I had to spend time going through documentation
              to get projects working properly.
            </p>
          </Link>
          <Link
            href={`/volleyball`}
            className="group opacity-80 transition hover:opacity-100"
          >
            <h3 className="mb-1 font-sans text-xl group-hover:underline">
              Volleyball Counter
            </h3>
            <p className="text-natural-700">
              One night, I was the referee for a volleyball game. I was
              frustrated that I had to count the points manually. So, I made
              this simple counter for tracking points and games. Later that day,
              It helped me a lot to focus on the game not remembering the number
              of points.
            </p>
          </Link>
        </div>
      </section> */}
    </main>
  );
}

const Skill = ({ skill }: { skill: (typeof skills)[0] }) => {
  return (
    <div className="group h-full w-full overflow-hidden">
      <li className="relative flex h-30 w-full flex-1 flex-col items-center justify-center gap-2 **:duration-300 md:items-center">
        <skill.icon className="size-16 group-hover:scale-50 group-hover:opacity-0 group-hover:blur-[2px]" />
        <div className="absolute inset-0 flex scale-150 flex-col items-center justify-center p-4 opacity-0 group-hover:scale-100 group-hover:opacity-100">
          <p className="text-sm font-bold">{skill.name}</p>
          <p className="text-natural-700 text-muted-foreground max-w-48 text-center text-xs">
            {skill.description}
          </p>
        </div>
      </li>
    </div>
  );
};

const Divider = ({
  className,
  borderTop,
}: {
  className?: string;
  borderTop?: boolean;
}) => {
  return (
    <div
      className={cn(
        "pointer-events-none col-span-2 mx-auto w-[calc(100%+var(--width))] -translate-x-[calc(var(--width)/2)] border-t border-dashed [--width:720px]",
        className
      )}
      style={{
        mask: borderTop
          ? "linear-gradient(to top, transparent, black, transparent)"
          : "linear-gradient(to left, transparent, black, transparent)",
      }}
    ></div>
  );
};

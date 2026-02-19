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
import { company, urls } from "@workspace/ui/lib/company";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { Divider } from "@/components/divider";

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
  const { data: currentUser } = useCurrentUser();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-20 px-8 pt-20">
      <div className="shadow-dialog dark bg-background text-foreground mb-8 flex items-center justify-between gap-8 rounded-xl p-6 backdrop-blur-sm transition-all dark:border">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Motion UI</h2>
          <p className="text-muted-foreground text-sm">
            Explore my collection of animation components and interactive UI
            elements built with Motion.
          </p>
        </div>
        <Link
          href="https://motion.alisamadii.com/"
          className={buttonVariants({})}
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
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://cal.com/alisamadii/15min`}
              className={buttonVariants({})}
            >
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
            {currentUser?.user?.email && (
              <Link
                href={`/settings`}
                className={buttonVariants({ variant: "outline", size: "icon" })}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                >
                  <title>gear-3</title>
                  <g fill="currentColor">
                    <path
                      opacity="0.4"
                      d="M15.6761 6.93381L14.7691 6.6138C14.6651 6.3628 14.9875491 6.11479 14.4111 5.87479C14.2801 5.64779 14.1151 5.44981 13.9601 5.24381L14.1441 4.2608C14.2971 3.4348 13.9121 2.59679 13.1841 2.17679L12.8321 1.97379C12.1041 1.55379 11.1871 1.63782 10.5481 2.18482L9.81909 2.80881C9.27609 2.73581 8.73209 2.7288 8.19609 2.7988L7.46809 2.17581C6.82909 1.62981 5.91109 1.54381 5.18309 1.96481L4.83209 2.16779C4.10409 2.58679 3.71909 3.4248 3.87309 4.2518L4.04709 5.18482C3.72109 5.60782 3.47209 6.0848 3.26309 6.5838L2.32409 6.9148C1.53209 7.1948 1.00009 7.94781 1.00009 8.78781V9.19281C1.00009 10.0338 1.53209 10.7858 2.32409 11.0658L3.23009 11.3858C3.33409 11.6368 3.44909 11.8848 3.58809 12.1238C3.71909 12.3518 3.88409 12.5498 4.04009 12.7558L3.85609 13.7388C3.70309 14.5648 4.08809 15.4028 4.81609 15.8228L5.16809 16.0258C5.47709 16.2038 5.8191 16.2918 6.1601 16.2918C6.6231 16.2918 7.0841 16.1298 7.4521 15.8148L8.17609 15.1948C8.45409 15.2318 8.73209 15.2518 9.00909 15.2518C9.27509 15.2518 9.54009 15.2338 9.80309 15.1998L10.5321 15.8238C10.9001 16.1388 11.3611 16.3008 11.8251 16.3008C12.1661 16.3008 12.5091 16.2138 12.8171 16.0348L13.1681 15.8318C13.8961 15.4128 14.2811 14.5748 14.1271 13.7478L13.9531 12.8138C14.2791 12.3908 14.5271 11.9148 14.7361 11.4168L15.6761 11.0848C16.4681 10.8048 17.0001 10.0518 17.0001 9.21179V8.80679C17.0001 7.96579 16.4681 7.21381 15.6761 6.93381Z"
                    ></path>{" "}
                    <path d="M9.00009 11.5C10.3808 11.5 11.5001 10.3807 11.5001 9C11.5001 7.61929 10.3808 6.5 9.00009 6.5C7.61938 6.5 6.50009 7.61929 6.50009 9C6.50009 10.3807 7.61938 11.5 9.00009 11.5Z"></path>
                  </g>
                </svg>
              </Link>
            )}
          </div>
        </div>
        <Link
          href={`${urls.portfolio}/how-i-build`}
          className="text-muted-foreground mt-2 inline-block px-3 text-sm underline"
        >
          How I Build
        </Link>
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

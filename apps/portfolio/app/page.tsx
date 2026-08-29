"use client";

import Link from "next/link";
import { FileUser } from "lucide-react";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { LogoV2 } from "@workspace/ui/icons/logo";
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
import { company, logos, projectsData, urls } from "@workspace/ui/lib/company";
import { cn } from "@workspace/ui/lib/utils";

import { ClientWork } from "@/components/client-work";
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

const howIWork = [
  {
    title: "I direct, AI executes",
    description:
      "I build with Claude Code every day — I decide the architecture first, AI implements it, and I review every change before it ships.",
  },
  {
    title: "My platform is the proof",
    description:
      "One codebase running 10 apps on 10 shared packages — portfolio, agency, admin, CMS, API — all built and operated end-to-end by me.",
  },
  {
    title: "Real speed",
    description:
      "Landing site in days. Full client site in about a week. SaaS MVP with auth, payments, and dashboard in 2–4 weeks.",
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
      <a
        href={urls.agency}
        className="group relative left-1/2 mb-8 block w-[min(72rem,100vw-2rem)] -translate-x-1/2 rounded-2xl bg-[#fc8464] p-8 text-white shadow-xl shadow-[#fc8464]/30 transition-all duration-300 hover:bg-[#f4744f] hover:shadow-2xl hover:shadow-[#fc8464]/40 md:p-10"
      >
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          Current focus
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-balance md:text-4xl">
          Ali Samadii LLC — Web Design &amp; Development Agency
        </p>
        <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
          Custom-coded websites, e-commerce storefronts, managed hosting, CMS,
          and SEO for small businesses. Looking for the agency? It lives at
          agency.alisamadii.com.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#c2451f] transition-transform duration-300 group-hover:translate-x-0.5">
          Visit the agency site →
        </span>
      </a>
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

        <div className="mt-7">
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
            {/* <Link
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
            </Link> */}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-8 text-sm font-normal tracking-[.3rem] uppercase">
          How I work
        </h2>

        <ul className="relative flex flex-col justify-center">
          <Divider />
          {howIWork.map((item) => (
            <li key={item.title} className="w-full p-6">
              <p className="text-sm font-bold">{item.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {item.description}
              </p>
            </li>
          ))}
          <Divider />
          <div className="flex justify-center p-8">
            <Button
              size={"lg"}
              variant={"outline"}
              className="w-full"
              render={<Link href={`/blog/how-i-build`} />}
            >
              How I Build — the full breakdown
            </Button>
          </div>
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
          Projects I&apos;m Building
        </h2>

        <ul className="relative grid grid-cols-2 items-center justify-items-center">
          <Divider />
          {projectsData.slice(0, 2).map((project) => (
            <Project key={project.name} {...project} />
          ))}
          <Divider />
          {projectsData.slice(2, 4).map((project) => (
            <Project key={project.name} {...project} />
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

        {projectsData.length > 4 && (
          <ul className="mt-4 grid grid-cols-2 border-t border-dashed [&>*]:border-b [&>*]:border-dashed [&>*:nth-child(odd)]:border-r">
            {projectsData.slice(4).map((project) => (
              <ProjectRow key={project.name} {...project} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-muted-foreground mb-8 text-sm font-normal tracking-[.3rem] uppercase">
          Work Experience
        </h2>

        <ul className="relative flex flex-col justify-center">
          <Divider />
          <ClientWork projectName="Crosspost" />
          <Divider />
          <ClientWork projectName="Bless" />
          <Divider />
          <ClientWork projectName="B402" />
          <Divider />
          <div className="flex justify-center p-8">
            <Button
              size={"lg"}
              variant={"outline"}
              className="w-full"
              render={<Link href={`/blog/how-i-build`} />}
            >
              How I Build
            </Button>
          </div>
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

const Project = ({
  name,
  logo,
  description,
  link,
  soon,
}: {
  name: (typeof projectsData)[number]["name"];
  logo: string;
  description: string;
  link?: string;
  soon?: boolean;
}) => {
  const content = (
    <>
      <img src={logo} alt={name} className="size-16 rounded-full" />
      <div className="flex flex-col items-center justify-center p-4">
        <p className="text-sm font-bold">{name}</p>
        <p className="text-natural-700 text-muted-foreground max-w-48 text-center text-xs">
          {description}
        </p>
      </div>
    </>
  );

  const baseClass =
    "relative flex w-full flex-1 flex-col items-center justify-center py-4 **:duration-300 md:items-center";

  // Private apps (e.g. Admin) ship no link — render a non-clickable card.
  if (!link) {
    return (
      <div className={cn(baseClass, "cursor-default", soon && "opacity-50")}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        baseClass,
        "hover:bg-muted/50 duration-200",
        soon && "cursor-progress opacity-50"
      )}
    >
      {content}
    </Link>
  );
};

// Compact text-only card for the overflow projects (no logo — the shared "A"
// logo repeats, so only the first four cards show it).
const ProjectRow = ({
  name,
  description,
  link,
  soon,
}: {
  name: (typeof projectsData)[number]["name"];
  description: string;
  link?: string;
  soon?: boolean;
}) => {
  const content = (
    <>
      <p className="text-sm font-bold">{name}</p>
      <p className="text-muted-foreground mt-1 max-w-56 text-xs">
        {description}
      </p>
    </>
  );

  const baseClass = "flex flex-col justify-center p-6 transition-colors";

  if (!link) {
    return (
      <div className={cn(baseClass, "cursor-default", soon && "opacity-50")}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        baseClass,
        "hover:bg-muted/50 duration-200",
        soon && "cursor-progress opacity-50"
      )}
    >
      {content}
    </Link>
  );
};

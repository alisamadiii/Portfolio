"use client";

import { useScroll, motion, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";

import { allTwitterContents } from "contentlayer/generated";

import { Text } from "@/components/ui/text";
import { Linkedin } from "lucide-react";
import { Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Experience from "@/components/experience";
import Apps from "@/components/apps";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const skills = [
  {
    name: "ReactJS",
    description: "A JavaScript library for building user interfaces",
  },
  {
    name: "NextJS",
    description: "The React framework for production-grade applications",
  },
  {
    name: "TailwindCSS",
    description: "A utility-first CSS framework for rapid UI development",
  },
  {
    name: "Motion",
    description: "A production-ready motion library for React",
  },
  {
    name: "Shadcn UI",
    description:
      "An open source UI component library for building high-quality interfaces",
  },
  {
    name: "Drizzle ORM",
    description:
      "A TypeScript ORM for SQL databases with a focus on type safety",
  },
  {
    name: "Better Auth",
    description: "A modern authentication library built",
  },
  {
    name: "Lemon Squeezy",
    description: "A platform for selling digital products",
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
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 250]);

  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-24">
      <div className="mb-8 flex items-center justify-between gap-8 rounded-xl bg-black/90 p-6 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/95">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Zuude UI</h2>
          <p className="text-sm text-gray-300">
            Explore my collection of animation components and interactive UI
            elements built with Motion.
          </p>
        </div>
        <Link href="https://pro.zuude-ui.com/">
          <Button variant="outline" className="text-black">
            Visit
          </Button>
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
      <div className="absolute inset-0 isolate -z-20 max-h-dvh overflow-hidden">
        <motion.div
          style={{ y: backgroundY }}
          className="mx-auto h-full w-full max-w-3xl translate-y-8 scale-110 bg-natural-100 blur-3xl"
        />

        <motion.div
          className="absolute inset-0 -z-10 h-full w-full"
          style={{
            y: backgroundY,
          }}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundColor: "#e5e5f7",
              opacity: 0.05,
              backgroundImage:
                "repeating-linear-gradient(45deg, #000000 25%, transparent 25%, transparent 75%, #000000 75%, #000000), repeating-linear-gradient(45deg, #000000 25%, #ffffff 25%, #ffffff 75%, #000000 75%, #000000)",
              backgroundPosition: "0 0, 40px 40px",
              backgroundSize: "80px 80px",
              maskImage: "linear-gradient(to top, transparent 45%, black)",
              transform: "skew(12deg) scale(1.5)",
            }}
          />
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Image
          src="/my-image.png"
          alt="Profile picture"
          width={128}
          height={128}
          className="h-24 w-24 rounded-full object-cover"
        />
        <div className="flex">
          <Link
            href="https://x.com/alirdev"
            className="flex size-8 items-center justify-center"
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
            >
              <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
            </svg>
          </Link>
          <Link
            href="https://x.com/alisamadi__"
            className="relative flex size-8 items-center justify-center"
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
            >
              <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
            </svg>
            <span className="absolute bottom-0 right-0 flex size-4 items-center justify-center rounded-full bg-primary text-xs text-white">
              2
            </span>
          </Link>
          <Link
            href="https://github.com/alisamadiii"
            className="flex size-8 items-center justify-center"
          >
            <Github />
          </Link>
          <Link
            href="https://www.linkedin.com/in/alireza17/"
            className="flex size-8 items-center justify-center"
          >
            <Linkedin />
          </Link>
        </div>
      </div>

      <Badge className="mt-7 text-xs">
        Currently building Motion UI with Motion
      </Badge>

      <div className="mt-2">
        <Text element="h1" variant="h1" className="text-3xl">
          Building <span className="text-primary">Website</span> is My Passion!
        </Text>
        <Text element="p" className="mt-2 text-lg text-natural-700">
          Hey, I&apos;m Ali! I&apos;ve been working in web development for 4
          years, mainly focusing on front-end development with ReactJS.
        </Text>
      </div>

      <div className="mt-8 flex flex-col items-start gap-1">
        <a href="mailto:a@alisamadii.com" className={buttonVariants({})}>
          Let&apos;s collaborate
        </a>
        <ExperienceContent />
      </div>

      <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          What I use
        </Text>

        <ul className="flex flex-col gap-4">
          {skills.map((skill) => (
            <li
              key={skill.name}
              className="flex flex-col gap-2 md:flex-row md:items-center"
            >
              <Text
                element="h3"
                variant="h3"
                className="mb-1 font-sans text-xl"
              >
                {skill.name}
              </Text>
              <Text variant="p2-r" className="text-natural-700">
                {skill.description}
              </Text>
            </li>
          ))}
        </ul>
      </section>

      <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          Projects
        </Text>

        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={project.link}
              target="_blank"
              className="group opacity-80 transition hover:opacity-100"
            >
              <Text
                element="h3"
                variant="h3"
                className="mb-1 font-sans text-xl group-hover:underline"
              >
                {project.name}
              </Text>
              <Text variant="p2-r" className="text-natural-700">
                {project.description}
              </Text>
            </Link>
          ))}
        </div>
      </section>

      <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          The App/Website I&apos;m using
        </Text>

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

      <TwitterContents />
      {/* <Works /> */}

      <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          Random Stuff
        </Text>

        <div className="flex flex-col gap-4">
          <Link
            href={`https://github.com/NowShip`}
            target="_blank"
            className="group opacity-80 transition hover:opacity-100"
          >
            <Text
              element="h3"
              variant="h3"
              className="mb-1 font-sans text-xl group-hover:underline"
            >
              Ship Now Organization
            </Text>
            <Text variant="p2-r" className="text-natural-700">
              I created this organization to help me build projects quickly,
              since previously I had to spend time going through documentation
              to get projects working properly.
            </Text>
          </Link>
          <Link
            href={`/volleyball`}
            className="group opacity-80 transition hover:opacity-100"
          >
            <Text
              element="h3"
              variant="h3"
              className="mb-1 font-sans text-xl group-hover:underline"
            >
              Volleyball Counter
            </Text>
            <Text variant="p2-r" className="text-natural-700">
              One night, I was the referee for a volleyball game. I was
              frustrated that I had to count the points manually. So, I made
              this simple counter for tracking points and games. Later that day,
              It helped me a lot to focus on the game not remembering the number
              of points.
            </Text>
          </Link>
        </div>
      </section>
    </main>
  );
}

function ExperienceContent() {
  const router = useRouter();
  return (
    <Suspense fallback={null}>
      <ExperienceDialog router={router} />
    </Suspense>
  );
}

function ExperienceDialog({ router }: { router: any }) {
  const searchParams = useSearchParams().get("experience");

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          router.push("/");
        } else {
          router.push("/?experience=true");
        }
      }}
      defaultOpen={searchParams === "true"}
    >
      <DialogTrigger className="text-natural-700 underline">
        My experience
      </DialogTrigger>
      <DialogContent className="h-full w-full max-w-3xl overflow-hidden px-0 py-0 text-natural-700 hover:text-natural-900 md:h-[95%] md:rounded-3xl">
        <Experience />
      </DialogContent>
    </Dialog>
  );
}

function TwitterContents() {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="relative my-20">
      <Text element="h2" variant="label" className="mb-8">
        Contents
      </Text>

      <div
        className={cn("grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3")}
        style={{
          maskImage: !showMore
            ? "linear-gradient(to top, transparent 10%, black 100%)"
            : "",
        }}
      >
        {allTwitterContents
          .sort((a, b) => Number(a.slugAsParams) - Number(b.slugAsParams))
          .slice(0, showMore ? allTwitterContents.length : 15)
          .map((content, index) => (
            <Link
              href={`/x-content/${index + 1}`}
              key={content._id}
              className="group rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md"
            >
              <span className="mb-2 block text-xs text-neutral-500">
                #{index + 1}
              </span>
              <h3 className="text-base font-medium text-neutral-900 transition-colors group-hover:text-primary">
                {allTwitterContents[index].title}
              </h3>
            </Link>
          ))}
      </div>
      <Button
        onClick={() => setShowMore(!showMore)}
        className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2",
          showMore && "bottom-[-54px]"
        )}
      >
        {showMore ? "Show Less" : "Show More"}
      </Button>
    </section>
  );
}

// function Works() {
//   const [showMore, setShowMore] = useState(false);

//   return (
//     <section className="relative my-20">
//       <Text element="h2" variant="label" className="mb-8">
//         Works (Animations)
//       </Text>

//       <div
//         className={cn("grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3")}
//         style={{
//           maskImage: !showMore
//             ? "linear-gradient(to top, transparent 10%, black 100%)"
//             : "",
//         }}
//       >
//         {allWorks
//           .sort((a, b) => Number(a.slugAsParams) - Number(b.slugAsParams))
//           .slice(0, showMore ? allWorks.length : 15)
//           .map((work, index) => (
//             <Link
//               href={`/work/${index + 1}`}
//               key={work._id}
//               className="group rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md"
//             >
//               <span className="mb-2 block text-xs text-neutral-500">
//                 #{index + 1}
//               </span>
//               <h3 className="text-base font-medium text-neutral-900 transition-colors group-hover:text-primary">
//                 {work.title}
//               </h3>
//             </Link>
//           ))}
//       </div>
//       <Button
//         onClick={() => setShowMore(!showMore)}
//         className={cn(
//           "absolute bottom-8 left-1/2 -translate-x-1/2",
//           showMore && "bottom-[-54px]"
//         )}
//       >
//         {showMore ? "Show Less" : "Show More"}
//       </Button>
//     </section>
//   );
// }

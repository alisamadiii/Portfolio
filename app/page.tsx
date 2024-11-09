"use client";

import { useScroll, motion, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { allBlogs } from "@/.contentlayer/generated";
import { Text } from "@/components/ui/text";
import { Linkedin } from "lucide-react";
import { Github } from "lucide-react";

export default function Home() {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-24">
      <div className="absolute inset-0 isolate -z-20 overflow-hidden">
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
        <div className="flex gap-2">
          <Link href="https://github.com/alisamadiii">
            <Github />
          </Link>
          <Link href="https://www.linkedin.com/in/alireza17/">
            <Linkedin />
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <Text element="h1" variant="h1" className="text-3xl">
          Building <span className="text-primary">Website</span> is My Passion!
        </Text>
        <Text element="p" className="mt-2 text-lg text-natural-700">
          Hey, I&apos;m Ali! I&apos;ve been working in web development for 3
          years, mainly focusing on front-end development with ReactJS.
        </Text>
      </div>

      <section className="my-20">
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
      </section>

      <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          Contents
        </Text>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 14 }).map((value, index) => (
            <Link
              href={`/x-content/${index + 1}`}
              key={index}
              className="flex min-h-12 grow basis-32 items-center justify-center rounded-lg bg-neutral-100 transition hover:bg-neutral-200"
            >
              {index + 1}
            </Link>
          ))}
        </div>
      </section>

      <section className="my-20">
        <Text element="h2" variant="label" className="mb-8">
          Animations
        </Text>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 17 }).map((value, index) => (
            <Link
              href={`/work/${index + 1}`}
              key={index}
              className="flex min-h-12 grow basis-32 items-center justify-center rounded-lg bg-neutral-100 transition hover:bg-neutral-200"
            >
              {index + 1}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

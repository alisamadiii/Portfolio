"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { allBlogs } from "contentlayer/generated";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/utils";
import { useSidebar } from "@/context/useSidebar";

export function RightSidebar() {
  const { blogs } = useParams<{ blogs: string[] }>();
  const { currentHeading } = useSidebar();

  const findingDocs = allBlogs.find(
    (doc) => doc.slug === `/${blogs.join("/")}`
  );

  console.log(currentHeading);

  return (
    <div className="sticky top-8 z-[9999] mt-8 overflow-hidden rounded-md border-wrapper bg-white p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-8">
        <h3 className="shrink-0">Table of Contents</h3>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={currentHeading}
            initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(4px)", y: -10 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0 }}
            className="block grow text-end text-sm text-muted"
          >
            {currentHeading}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.ul initial={{ height: 0 }} className="w-[280px] opacity-0">
        {findingDocs?.headings.map(
          (
            heading: { id: string; text: string; level: number },
            index: number
          ) => (
            <EachLink
              key={index}
              id={heading.id}
              text={heading.text}
              level={heading.level}
            />
          )
        )}
      </motion.ul>
    </div>
  );
}

function EachLink({
  id,
  text,
  level,
}: {
  id: string;
  text: string;
  level: number;
}) {
  const { currentHeading, setCurrentHeading } = useSidebar();

  useEffect(() => {
    const heading = document.querySelector(`.mdx #${id}`) as HTMLHeadingElement;

    if (!heading) {
      console.warn(`Heading with id ${id} not found`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setCurrentHeading(text);
        }
      },
      {
        rootMargin: "0% 0% -90% 0%",
        threshold: 0.1,
      }
    );

    observer.observe(heading);

    return () => {
      observer.unobserve(heading);
    };
  }, []);

  return (
    <li className="">
      <Link
        href={`#${id}`}
        className={cn(
          "opacity-50 duration-100",
          currentHeading === text && "font-semibold opacity-100"
        )}
        style={{ padding: level > 1 ? 4 * level : 0 }}
      >
        {text}
      </Link>
    </li>
  );
}

const transformSlugs = (slugs: string[]): Record<string, any>[] => {
  const result: Record<string, any>[] = [];

  slugs.forEach((slug) => {
    const parts = slug.split("/").filter(Boolean);
    const topLevel = parts[0];

    if (parts.length === 1) {
      result.push({ [topLevel]: `/${topLevel}` });
    } else {
      let existingGroup = result.find((item) => item[topLevel]);

      if (!existingGroup) {
        existingGroup = { [topLevel]: {} };
        result.push(existingGroup);
      }

      let currentGroup = existingGroup[topLevel];

      for (let i = 1; i < parts.length; i++) {
        if (i === parts.length - 1) {
          currentGroup[parts[i]] = slug;
        } else {
          currentGroup[parts[i]] = currentGroup[parts[i]] || {};
          currentGroup = currentGroup[parts[i]];
        }
      }
    }
  });

  return result;
};

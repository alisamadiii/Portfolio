"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { allContents } from "contentlayer/generated";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/utils";
import { useSidebar } from "@/context/useSidebar";

const contentNames = ["blogs", "challenges", "ui", "designs", "framer-motion"];

export function LeftSidebar() {
  const { contents } = useParams<{ contents: string[] }>();

  return (
    <div className="fixed top-0 z-20 h-dvh w-[280px] -translate-x-[120%] overflow-auto rounded-md border-r-wrapper bg-background p-4 md:sticky md:translate-x-0">
      <ul>
        {contentNames.map((name) => (
          <li>
            <span className="mb-2 mt-4 inline-block text-xs text-muted">
              {name}
            </span>
            <ul>
              {allContents
                .filter((content) => content.parentFolder === name)
                .sort((a, b) => {
                  const dayA = parseInt(
                    a.title.match(/Day (\d+)/)?.[1] || "0",
                    10
                  );
                  const dayB = parseInt(
                    b.title.match(/Day (\d+)/)?.[1] || "0",
                    10
                  );
                  return dayA - dayB;
                })
                .map((content) => (
                  <li>
                    <Link
                      href={`${content.slug}`}
                      className={cn(
                        "inline-block w-full truncate p-0.5 text-sm hover:opacity-70",
                        content.slug === `/${contents.join("/")}` &&
                          "text-primary"
                      )}
                    >
                      {content.title}
                    </Link>
                  </li>
                ))}{" "}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RightSidebar() {
  const { contents } = useParams<{ contents: string[] }>();
  const { currentHeading } = useSidebar();

  const findingDocs = allContents.find(
    (doc) => doc.slug === `/${contents.join("/")}`
  );

  return (
    findingDocs?.headings.length > 4 && (
      <div className="sticky top-8 z-[20] mb-5 overflow-hidden rounded-md border-wrapper bg-background p-4">
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
    )
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

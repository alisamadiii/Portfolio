import React from "react";
import Link from "next/link";

import { cn } from "@workspace/ui/lib/utils";

import { B402, Bless, Crosspost } from "./icons/clients";

const projects = [
  {
    name: "Crosspost",
    description:
      "A platform that allows you to cross-post your content to multiple platforms.",
    href: "/client/crosspost",
    icon: Crosspost,
    colors: ["#FB3953", "#CC50F8"],
  },
  {
    name: "Bless",
    description: "The world's first shared computer.",
    href: "https://bless.network/",
    icon: Bless,
    colors: ["#0b090c", "#9a9aa2", "#515055"],
  },
  {
    name: "B402",
    description: "The world's first shared computer.",
    href: "https://b402.ai/",
    icon: B402,
    colors: ["#f3ba2f"],
  },
] as const;

export const ClientWork = ({
  projectName,
}: {
  projectName: (typeof projects)[number]["name"];
}) => {
  const project = projects.find((project) => project.name === projectName);

  if (!project) {
    return null;
  }

  return (
    <Link
      href={project.href}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-4 overflow-hidden p-8",
        "duration-500 hover:text-white hover:delay-100"
      )}
    >
      <div className="absolute inset-0 -z-10 grid grid-cols-10 items-start justify-start">
        {Array.from({ length: 30 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-full w-full scale-0 bg-yellow-200 opacity-0 duration-300",
              "group-hover:scale-100 group-hover:opacity-100"
            )}
            style={{
              transitionDelay: `${Math.random() * 40}ms`,
              backgroundColor:
                project.colors[
                  Math.floor(Math.random() * project.colors.length)
                ],
            }}
          />
        ))}
      </div>
      <div
        className={cn(
          "bg-muted/30 dark:bg-muted shadow-card flex size-16 items-center justify-center rounded-lg duration-700",
          "group-hover:bg-white dark:group-hover:bg-white"
        )}
      >
        <project.icon
          className={cn(
            "size-8 duration-500",
            project.name === "Bless" &&
              "text-black dark:text-white dark:group-hover:text-black"
          )}
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-2">
        <h3 className="text-2xl font-bold">{project.name}</h3>
        <p className="max-w-sm text-center text-sm">{project.description}</p>
      </div>
    </Link>
  );
};

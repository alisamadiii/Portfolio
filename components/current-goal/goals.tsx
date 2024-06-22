"use client";

import React, { useEffect, useState } from "react";
import EachGoal from "./each-goal";
import { type Database } from "@/database.types";
import Link from "next/link";

interface Props {
  goals: Array<Database["public"]["Tables"]["goals"]["Row"]>;
}

export default function Goals({ goals }: Props) {
  const [hover, setHover] = useState(false);
  const [hovering, setHovering] = useState(false);

  const onMouseEnter = () => setHovering(true);
  const onMouseLeave = () => {
    setHovering(false);
    setHover(false);
  };

  useEffect(() => {
    if (hovering) {
      const timeout = setTimeout(() => {
        setHover(true);
      }, 200);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [hovering]);

  return (
    <>
      <ul
        className="avatars-z-index mb-8 flex flex-col gap-4"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {goals.map((goal, index) => (
          <EachGoal
            key={goal.id}
            goals={goals}
            goal={goal}
            index={index}
            hover={hover}
          />
        ))}
      </ul>
      <Link
        href="/goals/mastering-framer-motion"
        className={`mx-auto flex h-6 w-fit items-center justify-center rounded-md bg-white px-2 text-sm text-black duration-200 hover:bg-white/90 active:scale-95 ${hover ? "mb-8" : "-translate-y-8"}`}
      >
        Read more
      </Link>
    </>
  );
}

"use client";

import React from "react";
import { type Database } from "@/database.types";
import Link from "next/link";
import Badge from "../badge";

interface Props {
  goals: Array<Database["public"]["Tables"]["goals"]["Row"]>;
}

export default function Goals({ goals }: Props) {
  return (
    <>
      {/* <ul
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
      </ul> */}
      {/* <Link
        href="/goals/mastering-framer-motion"
        className={`mx-auto flex h-6 w-fit items-center justify-center rounded-md bg-white px-2 text-sm text-black duration-200 hover:bg-white/90 active:scale-95 ${hover ? "mb-8" : "-translate-y-8"}`}
      >
        Read more
      </Link> */}
      <Link href={"/goals/mastering-framer-motion"} className="mb-8">
        <Badge>
          <h2>Done with 50-day challenges: Mastering Framer Motion</h2>
        </Badge>
      </Link>
    </>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { SiReactquery, SiSupabase } from "react-icons/si";
import { RiSecurePaymentFill } from "react-icons/ri";

import { type Database } from "@/database.types";
import { differenceInDays } from "date-fns";
import { cn } from "@/utils";

function getCurrentDay(startDate: string) {
  const today = new Date();
  return differenceInDays(today, new Date(startDate)) + 1; // Adding 1 to include the start day
}

function getDaySuffix(day: number) {
  if (day % 10 === 1 && day % 100 !== 11) {
    return "st";
  } else if (day % 10 === 2 && day % 100 !== 12) {
    return "nd";
  } else if (day % 10 === 3 && day % 100 !== 13) {
    return "rd";
  } else {
    return "th";
  }
}

interface Props {
  goals: Array<Database["public"]["Tables"]["goals"]["Row"]>;
  goal: Database["public"]["Tables"]["goals"]["Row"];
  index: number;
  hover: boolean;
}

export default function EachGoal({ goals, goal, index, hover }: Props) {
  const currentDay = getCurrentDay(goal.from || "");
  const daySuffix = getDaySuffix(currentDay);

  const notFirstIndex = index > 0;

  return (
    <motion.li
      initial={{
        marginTop: notFirstIndex ? "var(--margin-top)" : 0,
        scale: notFirstIndex ? 1 - index * 0.06 : 1,
        opacity: notFirstIndex ? 1 - index * 0.3 : 1,
      }}
      animate={{
        marginTop: notFirstIndex ? (hover ? 0 : "var(--margin-top)") : 0,
        scale: notFirstIndex ? (hover ? 1 : 1 - index * 0.06) : 1,
        opacity: notFirstIndex ? (hover ? 1 : 1 - index * 0.3) : 1,
      }}
      transition={{ duration: 0.5, type: "spring", bounce: 0 }}
      className="relative [--margin-top:-145px] md:[--margin-top:-100px]"
    >
      <Link
        href={hover ? "/goals/mastering-framer-motion" : "#"}
        className={cn(
          "relative isolate flex h-36 items-center overflow-hidden rounded-md border border-border bg-white p-4 text-black md:h-24",
          notFirstIndex && "bg-box text-white"
        )}
      >
        <div className="self-start">
          <h3 className="text-lg font-medium">{goal.title}</h3>
          {index < 2 ? (
            !notFirstIndex ? (
              <p className="text-sm text-muted-2">
                I am on {currentDay}
                {daySuffix} day.
              </p>
            ) : (
              <p className="text-sm text-muted-2">
                I will start on {goal.from}.
              </p>
            )
          ) : (
            <p className="text-sm text-muted-2">
              I will start after {goals[index - 1].title}.
            </p>
          )}
        </div>

        {!notFirstIndex && (
          <p className="absolute right-0 -z-20 translate-y-14 text-[12rem] font-black md:translate-y-4">
            {currentDay}
          </p>
        )}

        {notFirstIndex ? (
          <div className="absolute right-0 -z-20 translate-y-14 text-[12rem] font-black md:translate-y-4 md:text-[8rem]">
            {goal.title.toLowerCase().includes("query") ? (
              <SiReactquery />
            ) : goal.title.toLowerCase().includes("supabase") ? (
              <SiSupabase />
            ) : goal.title.toLowerCase().includes("lemon") ? (
              <RiSecurePaymentFill />
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "absolute bottom-0 right-0 -z-10 h-1/2 w-full translate-y-2 bg-gradient-to-t to-transparent md:h-full",
            notFirstIndex ? "from-box" : "from-white"
          )}
        ></div>
      </Link>
    </motion.li>
  );
}

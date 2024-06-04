import React from "react";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { type Database } from "@/database.types";

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

export default async function CurrentGoal() {
  try {
    const res = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/" + "goal?select=*",
      {
        // @ts-ignore
        headers: {
          apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        next: { revalidate: 120 },
      }
    );

    const data: Array<Database["public"]["Tables"]["goal"]["Row"]> =
      await res.json();

    const currentGoal = data[0];

    if (!res.ok) {
      console.log("something went wrong!");
      return null;
    }

    const currentDay = getCurrentDay(currentGoal.from || "");
    const daySuffix = getDaySuffix(currentDay);

    return (
      <Link
        href={"/goals/mastering-framer-motion"}
        className="relative isolate mb-8 flex h-36 items-center overflow-hidden rounded-md border border-border bg-white p-4 text-black md:h-24"
      >
        <div className="self-start">
          <h3 className="text-lg font-medium">{currentGoal.title}</h3>
          <p className="text-sm text-muted-2">
            I am on {currentDay}
            {daySuffix} day.
          </p>
        </div>
        <p className="absolute right-0 -z-20 translate-y-14 text-[12rem] font-black md:translate-y-4">
          {currentDay}
        </p>

        <div className="absolute bottom-0 right-0 -z-10 h-1/2 w-full bg-gradient-to-t from-white to-transparent md:h-full"></div>
      </Link>
    );
  } catch (error) {
    return null;
  }
}

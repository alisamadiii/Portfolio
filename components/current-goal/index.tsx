import React from "react";

import { type Database } from "@/database.types";
import Goals from "./goals";

export default async function CurrentGoal() {
  try {
    const res = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/" + "goals?select=*",
      {
        // @ts-ignore
        headers: {
          apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        next: { revalidate: 10 },
      }
    );

    const data: Array<Database["public"]["Tables"]["goals"]["Row"]> =
      await res.json();

    if (!res.ok) {
      console.log("something went wrong!");
      return null;
    }

    return <Goals goals={data} />;
  } catch (error) {
    return null;
  }
}

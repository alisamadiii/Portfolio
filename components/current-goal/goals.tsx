"use client";

import React, { useState } from "react";
import EachGoal from "./each-goal";
import { type Database } from "@/database.types";

interface Props {
  goals: Array<Database["public"]["Tables"]["goals"]["Row"]>;
}

export default function Goals({ goals }: Props) {
  const [hover, setHover] = useState(false);

  const onMouseEnter = () => setHover(true);
  const onMouseLeave = () => setHover(false);

  return (
    <ul
      className="avatars-z-index mb-8 flex flex-col gap-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {goals.map((goal, index) => (
        <EachGoal key={goal.id} goal={goal} index={index} hover={hover} />
      ))}
    </ul>
  );
}

import React from "react";

import ContentWrapper from "@/components/content-wrapper";

import { allGoals } from "contentlayer/generated";
import Link from "next/link";

export default function GoalsPage() {
  return (
    <ContentWrapper>
      {allGoals.map((goal) => (
        <Link key={goal._id} href={goal.slug}>
          {goal.title}
        </Link>
      ))}
    </ContentWrapper>
  );
}

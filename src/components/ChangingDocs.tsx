"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { allContents } from "contentlayer/generated";

export default function ChangingDocs() {
  const { contents } = useParams<{ contents: string[] }>();

  const findingGoal = allContents.find(
    (post) => `/${contents.join("/")}` === post.slug
  );

  const filteredContents = allContents
    .filter((content) => {
      if (findingGoal?.isChallenge) {
        return content.isChallenge;
      } else {
        return !content.isChallenge;
      }
    })
    .sort((a, b) => {
      const getDayNumber = (title: string) => {
        const match = title.match(/Day (\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      return getDayNumber(a.title) - getDayNumber(b.title);
    });

  const docsIndx = filteredContents.findIndex(
    (doc) => doc.slug === `/${contents.join("/")}`
  );

  return (
    <div className="mt-8 flex justify-between gap-8 border-t-wrapper pt-6 text-muted">
      {filteredContents[docsIndx - 1] && (
        <Link
          href={filteredContents[docsIndx - 1].slug}
          className="flex flex-col gap-1 hover:text-foreground"
        >
          <span className="text-sm">Previous</span>
          {filteredContents[docsIndx - 1].title}
        </Link>
      )}
      {filteredContents[docsIndx + 1] && (
        <Link
          href={filteredContents[docsIndx + 1].slug}
          className="ml-auto flex flex-col items-end gap-1 text-right hover:text-foreground"
        >
          <span className="text-sm">Next</span>
          {filteredContents[docsIndx + 1].title}
        </Link>
      )}
    </div>
  );
}

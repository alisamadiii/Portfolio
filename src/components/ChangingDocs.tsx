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

  // const docsIndx = allContents.findIndex(
  //   (doc) => doc.slug === `/${contents.join("/")}`
  // );

  const filteredContents = allContents.filter((content) => {
    if (findingGoal?.isChallenge) {
      return content.isChallenge;
    } else {
      return !content.isChallenge;
    }
  });

  const docsIndx = filteredContents.findIndex(
    (doc) => doc.slug === `/${contents.join("/")}`
  );

  console.log(filteredContents);

  return (
    <div className="mt-8 flex justify-between border-t-wrapper pt-6 text-muted">
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
          className="ml-auto flex flex-col items-end gap-1 hover:text-foreground"
        >
          <span className="text-sm">Next</span>
          {filteredContents[docsIndx + 1].title}
        </Link>
      )}
    </div>
  );
}

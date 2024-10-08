import React from "react";

import { allBlogs } from "@/.contentlayer/generated";
import { Mdx } from "./MDX/MDXContent.blog";
import { DialogClose } from "./ui/dialog";

export default function Experience() {
  const findingGoal = allBlogs.find(
    (post) => post.slugAsParams === "my-experience"
  );

  if (!findingGoal) return null;

  return (
    <div className="overflow-y-auto px-4 py-8 md:px-0">
      <div className="mx-auto mb-8 flex max-w-xl">
        <DialogClose className="text-natural-600">Close</DialogClose>
      </div>

      <Mdx code={findingGoal.body.code} />
    </div>
  );
}

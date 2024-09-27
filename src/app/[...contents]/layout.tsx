import React from "react";

import { LeftSidebar, RightSidebar } from "@/components/Sidebar";
import { allContents } from "contentlayer/generated";
import ChangingDocs from "@/components/ChangingDocs";

export async function generateStaticParams() {
  return allContents.map((post) => ({
    contents: post.slug.split("/").slice(1),
  }));
}

// or Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: { contents: string[] };
}) {
  const findingGoal = allContents.find(
    (post) => `/${params.contents.join("/")}` === post.slug
  );

  return {
    title: findingGoal?.title,
  };
}

type Props = {
  children: React.ReactNode;
};

export default function DocsLayout({ children }: Props) {
  return (
    <div className="mx-auto flex w-full items-start">
      <LeftSidebar />
      <main className="grow overflow-hidden">
        <div className="mx-auto w-full max-w-[800px] py-8">
          <RightSidebar />
          {children}
          <ChangingDocs />
        </div>
      </main>
    </div>
  );
}

import React from "react";

import { RightSidebar } from "@/components/Sidebar";
import { allContents } from "contentlayer/generated";
import ChangingDocs from "@/components/ChangingDocs";

export async function generateStaticParams() {
  return allContents.map((post) => ({
    contents: post.slug.split("/").slice(1),
  }));
}

type Props = {
  children: React.ReactNode;
};

export default function DocsLayout({ children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <RightSidebar />
      <main className="w-full overflow-hidden py-8">
        {children}
        <ChangingDocs />
      </main>
    </div>
  );
}

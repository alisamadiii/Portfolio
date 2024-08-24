import React from "react";

import { RightSidebar } from "@/components/Sidebar";
import { allBlogs } from "contentlayer/generated";
import ChangingDocs from "@/components/ChangingDocs";

export async function generateStaticParams() {
  return allBlogs.map((post) => ({
    docs: post.slug.split("/").slice(1),
  }));
}

type Props = {
  children: React.ReactNode;
};

export default function DocsLayout({ children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="fixed top-0 z-50 h-24 w-full max-w-3xl rounded-b-[100%] bg-gradient-to-b from-white to-white/10 backdrop-blur-sm"></div>
      <RightSidebar />
      <main className="w-full overflow-hidden py-8">
        {children}
        <ChangingDocs />
      </main>
    </div>
  );
}

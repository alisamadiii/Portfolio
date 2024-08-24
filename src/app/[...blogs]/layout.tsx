import React from "react";

import { RightSidebar } from "@/components/Sidebar";
import { allBlogs } from "contentlayer/generated";
import ChangingDocs from "@/components/ChangingDocs";

export async function generateStaticParams() {
  return allBlogs.map((post) => ({
    blogs: post.slug.split("/").slice(1),
  }));
}

type Props = {
  children: React.ReactNode;
};

export default function DocsLayout({ children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="from-background to-background/10 fixed left-1/2 top-0 z-50 h-24 w-full max-w-4xl -translate-x-1/2 rounded-b-[100%] bg-gradient-to-b backdrop-blur-[2px]"></div>
      <RightSidebar />
      <main className="w-full overflow-hidden py-8">
        {children}
        <ChangingDocs />
      </main>
    </div>
  );
}

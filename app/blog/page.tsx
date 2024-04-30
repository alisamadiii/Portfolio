import React from "react";
import { type Metadata } from "next";
import BlogLinks from "./blog-links";
import ContentWrapper from "@/components/content-wrapper";

export const metadata: Metadata = {
  title: "Blog",
};

export default function Blog() {
  return (
    <ContentWrapper>
      <h1 className="text_gradient mb-8 text-2xl font-extrabold">
        read my blogs
      </h1>
      <BlogLinks />
    </ContentWrapper>
  );
}

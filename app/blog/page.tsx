import React from "react";
import { type Metadata } from "next";
import BlogLinks from "./blog-links";

export const metadata: Metadata = {
  title: "Blog",
};

export default function Blog() {
  return (
    <>
      <h1 className="mb-8 text-2xl font-bold">read my blogs</h1>
      <BlogLinks />
    </>
  );
}

import React from "react";
import BlogLinks from "./blog-links";
import { Metadata } from "next";

type Props = {};

export const metadata: Metadata = {
  title: "Blog",
};

export default function Blog({}: Props) {
  return (
    <>
      <h1 className="mb-8 text-2xl font-bold">read my blogs</h1>
      <BlogLinks />
    </>
  );
}

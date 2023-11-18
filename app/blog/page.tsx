import React from "react";
import BlogLinks from "./blog-links";

type Props = {};

export default function Blog({}: Props) {
  return (
    <>
      <h1 className="mb-8 text-2xl font-bold">read my blogs</h1>
      <BlogLinks />
    </>
  );
}

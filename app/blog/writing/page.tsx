import React from "react";
import { type Metadata } from "next";
import Form from "./form";

export const metadata: Metadata = {
  title: "Blog",
};

export default function Writing() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-2 text-2xl font-bold">
        This blog is not completed yet
      </h1>
      <h2 className="mb-4">but you can get notify once it is done</h2>
      <Form />
    </div>
  );
}

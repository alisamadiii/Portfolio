"use client";

import React from "react";

import { Index } from "@/__registry__";

type Props = {
  params: { slug: string };
};

export default function DocsPage({ params: { slug } }: Props) {
  const Component = Index[`works-${slug}`].component;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white">
      <div className="mx-auto max-w-3xl pt-36">
        <Component />
      </div>
    </div>
  );
}

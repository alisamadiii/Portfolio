"use client";

import React from "react";

import { Index } from "@/__registry__";

interface Props {
  name: string;
  children: React.ReactNode;
}

export default function ComponentPreview({ name }: Props) {
  const Component = Index[name].component;

  return (
    <div className="relative mb-12 flex min-h-96 items-center justify-center rounded-md border-wrapper py-8">
      <Component />
    </div>
  );
}

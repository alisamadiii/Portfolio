"use client";

import React from "react";
import { Index } from ".";
import { useCurrentElementStore } from "../page";

export default function HeadTags() {
  const { currentElement } = useCurrentElementStore();

  const name = Index[currentElement].name;

  return (
    <head>
      <title>{name.replaceAll("-", " ")}</title>
    </head>
  );
}

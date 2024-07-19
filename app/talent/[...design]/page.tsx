import React from "react";

import { type CollectionsTypes, type IndexData, NewIndex } from "../designs";
import { notFound } from "next/navigation";
import Shoutout from "@/components/Shoutout";
import AnimationWrapper from "./animation-wrapper";

interface props {
  params: { design: any[] };
}

const collections: CollectionsTypes = [
  "general",
  "animations-dev",
  "50-day-challenge",
  "clip-path",
  "30-day-challenge",
];

// or Dynamic metadata
export async function generateMetadata({ params }: props) {
  const from = params.design[0] as keyof IndexData;
  const name = params.design[1];

  const Component = NewIndex[from].find((value) => value.name === name);

  return {
    title: Component?.name
      .replaceAll("-", " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  };
}

export default function EachDesigns({ params }: props) {
  const from = params.design[0] as keyof IndexData;
  const name = params.design[1];

  if (!collections.includes(from)) {
    return notFound();
  }

  const Component = NewIndex[from].find((value) => value.name === name);

  return (
    <AnimationWrapper key={name}>
      {Component ? <Component.component /> : <div>Not Found</div>}
      {Component?.from && (
        <Shoutout name={Component.from.creator} link={Component.from.link} />
      )}
    </AnimationWrapper>
  );
}

import React from "react";

import { type CollectionsTypes, type IndexData, NewIndex } from "../designs";
import { notFound } from "next/navigation";

interface props {
  params: { design: any[] };
}

const collections: CollectionsTypes = ["general", "animations-dev"];

export default function EachDesigns({ params }: props) {
  const from = params.design[0] as keyof IndexData;
  const name = params.design[1];

  if (!collections.includes(from)) {
    return notFound();
  }

  const Component = NewIndex[from].find((value) => value.name === name);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center">
      {Component ? <Component.component /> : <div>Not Found</div>}
    </main>
  );
}

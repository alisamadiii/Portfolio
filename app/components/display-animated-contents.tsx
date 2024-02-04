"use client";

import React from "react";
import { type TechsTypes, type TechsDataType, techsData } from "../lib/data";

export default function DisplayAnimatedContents() {
  return (
    <ul className="mb-8 flex flex-col gap-8">
      <Techs tech="html" />
      <Techs tech="css" />
      <Techs tech="js" />
    </ul>
  );
}

function Techs({ tech }: { tech: TechsTypes }) {
  return (
    <div>
      <h2 className="relative isolate mb-2 inline-block rounded text-sm uppercase before:absolute before:-z-10 before:h-full before:w-full before:-rotate-3 before:scale-150 before:rounded-lg before:bg-box">
        {tech === "js" ? "javascript" : tech}
      </h2>
      <ul className="list-disc pl-8">
        {techsData
          .filter((data) => data.tech === tech)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((data, index) => (
            <EachTech key={index} data={data} />
          ))}
      </ul>
    </div>
  );
}

function EachTech({ data }: { data: TechsDataType }) {
  return (
    <li className="group">
      <a
        href={data.link}
        target="_blank"
        className="inline-block py-1 text-muted-3 hover:text-foreground"
        id="anchor"
        rel="noreferrer"
      >
        {data.name}
      </a>
    </li>
  );
}

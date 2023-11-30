import React from "react";
import { techsData } from "../lib/data";

interface Props {
  tech: "html" | "css" | "js";
}

export default function DisplayAnimatedContents({ tech }: Props) {
  const currentTech = {
    html: techsData.html.map((data, index) => (
      <li key={index} className="group grow basis-80">
        <a
          href={data.link}
          target="_blank"
          className="flex h-20 items-center justify-center overflow-hidden rounded-xl border-[0.5px] border-border bg-box/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_10px_10px_rgba(255,255,255,.02)] backdrop-blur-sm duration-200 hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"
          id="anchor" rel="noreferrer"
        >
          {data.name}
        </a>
      </li>
    )),
    css: techsData.css.map((data, index) => (
      <li key={index} className="group grow basis-80">
        <a
          href={data.link}
          target="_blank"
          className="flex h-20 items-center justify-center overflow-hidden rounded-xl border-[0.5px] border-border bg-box/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_10px_10px_rgba(255,255,255,.02)] backdrop-blur-sm duration-200 hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"
          id="anchor" rel="noreferrer"
        >
          {data.name}
        </a>
      </li>
    )),
    js: techsData.js.map((data, index) => (
      <li key={index} className="group grow basis-80">
        <a
          href={data.link}
          target="_blank"
          className="flex h-20 items-center justify-center overflow-hidden rounded-xl border-[0.5px] border-border bg-box/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_10px_10px_rgba(255,255,255,.02)] backdrop-blur-sm duration-200 hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"
          id="anchor" rel="noreferrer"
        >
          {data.name}
        </a>
      </li>
    )),
  }[tech];

  return <ul className="flex flex-wrap gap-2">{currentTech}</ul>;
}

import React from "react";

import * as Element from "@/components/TwitterContentsElement";

const inlineElements = [
  {
    name: "a",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a",
  },
  {
    name: "abbr",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr",
  },
  {
    name: "acronym",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/acronym",
  },
  {
    name: "b",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b",
  },
  {
    name: "bdo",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo",
  },
  {
    name: "big",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/big",
  },
  {
    name: "br",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br",
  },
  {
    name: "button",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button",
  },
  {
    name: "cite",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite",
  },
  {
    name: "code",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code",
  },
  {
    name: "dfn",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn",
  },
  {
    name: "em",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em",
  },
  {
    name: "i",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i",
  },
  {
    name: "img",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img",
  },
  {
    name: "input",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input",
  },
  {
    name: "kbd",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd",
  },
  {
    name: "label",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label",
  },
  {
    name: "map",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map",
  },
  {
    name: "object",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object",
  },
  {
    name: "output",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output",
  },
  {
    name: "q",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q",
  },
  {
    name: "samp",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp",
  },
  {
    name: "script",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script",
  },
  {
    name: "select",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select",
  },
  {
    name: "small",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small",
  },
  {
    name: "span",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span",
  },
  {
    name: "strong",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong",
  },
  {
    name: "sub",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub",
  },
  {
    name: "sup",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup",
  },
  {
    name: "textarea",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea",
  },
  {
    name: "time",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time",
  },
  {
    name: "tt",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tt",
  },
  {
    name: "var",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var",
  },
];

export default function InlineElements() {
  return (
    <Element.Wrapper>
      <Element.Preview className="min-h-0">
        <p className="flex flex-wrap gap-4">
          {inlineElements.map((element) => (
            <a
              key={element.name}
              href={element.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {element.name}
            </a>
          ))}
        </p>
      </Element.Preview>
    </Element.Wrapper>
  );
}

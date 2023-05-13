import React from "react";

type Props = {
  headingElements: any;
};

export default function Table_Contents({ headingElements }: Props) {
  return (
    <div className="flex flex-col gap-1 mt-4">
      {headingElements &&
        [...headingElements].map((heading, index) => (
          <a
            key={index}
            href={`#${heading.id}`}
            className="px-2 border-2 border-transparent rounded-md hover:border-primary"
          >
            {heading.textContent}
          </a>
        ))}
    </div>
  );
}

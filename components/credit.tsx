import React from "react";

interface Props {
  name: string;
  website: string;
  url?: string;
}

export default function GivingCredit({ name, website, url }: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted">
      Inspired by{" "}
      <a href={url} target="_blank" rel="noreferrer">
        {name}
      </a>{" "}
      -{" "}
      <a href={website} target="_blank" rel="noreferrer">
        {website}
      </a>
    </div>
  );
}

import Image from "next/image";
import React from "react";

interface Props {
  title: string;
  description: string;
  url: string;
  reverse?: boolean;
}

export default function ImageExplain({
  title,
  description,
  url,
  reverse = false,
}: Props) {
  return (
    <div className="my-6">
      <div>
        <h3 className="text-lg">{title}</h3>
        <p className="text-sm text-muted-2">{description}</p>
      </div>
      <Image
        src={url}
        width={1200}
        height={600}
        alt={title}
        className="mt-2 w-full rounded-lg"
      />
    </div>
  );
}

"use client";

import React from "react";

export default function HeadTags({ name }: { name: string }) {
  return (
    <head>
      <title>{name.replaceAll("-", " ")}</title>
    </head>
  );
}

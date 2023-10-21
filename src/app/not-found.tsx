import React from "react";

import { Text } from "@/components/ui/text";
import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found - Ali Reza",
};

export default function NotFound() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-8">
      <Text className="cursor-pointer text-9xl font-black text-accents-8">
        404
      </Text>

      <Link
        href={"/"}
        className="flex h-12 items-center justify-center gap-2 rounded bg-button px-7 font-medium tracking-[-0.02rem] text-button-foreground transition-colors duration-150 hover:bg-button/90 focus-visible:shadow-focus-button focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        home page
      </Link>

      <div className="lines">
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div>
    </div>
  );
}

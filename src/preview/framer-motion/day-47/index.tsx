"use client";

import React from "react";
import EachThread from "./each-thread";
import { myImage } from "@/utils";
import Wrapper from "@/components/designs/wrapper";

export default function Day47() {
  return (
    <Wrapper className="h-auto min-h-dvh justify-start py-24">
      <div className="w-full max-w-2xl rounded-xl bg-gray-100 p-8">
        <EachThread image={myImage || ""} username={"Ali Reza"} />
        <EachThread image={myImage || ""} username={"Ali Reza"} />
      </div>
    </Wrapper>
  );
}

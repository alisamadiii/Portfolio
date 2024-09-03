"use client";

import React from "react";
import EachThread from "./each-thread";
import { myImage } from "@/utils";

export default function Day47() {
  return (
    <div className="w-full max-w-2xl rounded-xl bg-gray-100 p-8">
      <EachThread image={myImage || ""} username={"Ali Reza"} />
      <EachThread image={myImage || ""} username={"Ali Reza"} />
    </div>
  );
}

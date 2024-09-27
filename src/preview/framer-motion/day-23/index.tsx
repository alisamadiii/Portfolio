"use client";

import React, { useState } from "react";

import Header from "./header";
import Buttons from "./buttons";
import Hr from "@/components/hr";
import Page from "./pages";
import IphoneSimulator from "@/components/IphoneSimulator";

export type panelsType =
  | "posts"
  | "replies"
  | "highlights"
  | "articles"
  | "media";

export default function Day23() {
  const [selectedPanel, setSelectedPanel] = useState<panelsType>("posts");

  return (
    <IphoneSimulator className="bg-[#E1E1E1]">
      <div className="text-black">
        <Header />
        <Buttons
          selectedPanel={selectedPanel}
          setSelectedPanel={setSelectedPanel}
        />

        <Hr className="mt-0 bg-[#D7D7D7]" />

        <Page selectedPanel={selectedPanel} />
      </div>
    </IphoneSimulator>
  );
}

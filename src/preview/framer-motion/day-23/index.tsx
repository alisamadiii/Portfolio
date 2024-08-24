"use client";

import React, { useState } from "react";

import IphoneSimulator from "@/components/iphone-simulator";
import Header from "./header";
import Buttons from "./buttons";
import Hr from "@/components/hr";
import Page from "./pages";

export type panelsType =
  | "posts"
  | "replies"
  | "highlights"
  | "articles"
  | "media";

export default function Day23() {
  const [selectedPanel, setSelectedPanel] = useState<panelsType>("posts");

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#E1E1E1] text-black">
      <IphoneSimulator mixBlend={false} mainClassName="bg-[#E1E1E1] pt-0">
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
    </div>
  );
}

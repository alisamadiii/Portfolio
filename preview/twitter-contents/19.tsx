import React from "react";

import * as Element from "@/components/TwitterContentsElement";

export default function TwitterContents19() {
  return (
    <Element.Wrapper>
      <Element.Preview className="flex-row gap-4">
        <div id="scrollbar-1" className="h-80 w-4 overflow-auto">
          <div className="h-dvh w-full"></div>
        </div>
        <div id="scrollbar-2" className="h-80 w-4 overflow-auto">
          <div className="h-dvh w-full"></div>
        </div>
        <div id="scrollbar-3" className="h-80 w-4 overflow-auto">
          <div className="h-dvh w-full"></div>
        </div>
        <div id="scrollbar-4" className="h-80 w-4 overflow-auto">
          <div className="h-dvh w-full"></div>
        </div>
        <div id="scrollbar-5" className="h-80 w-4 overflow-auto">
          <div className="h-dvh w-full"></div>
        </div>
        <div id="scrollbar-6" className="h-80 w-4 overflow-auto">
          <div className="h-dvh w-full"></div>
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}

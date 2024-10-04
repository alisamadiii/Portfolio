import React from "react";

import * as Element from "@/components/TwitterContentsElement";

export default function TwitterContents5Design1() {
  return (
    <Element.Wrapper>
      <Element.Preview className="block min-h-60">
        <details className="group">
          <summary className="w-fit cursor-pointer rounded-lg border border-neutral-300 bg-neutral-200 p-3">
            System Requirements
          </summary>
          <p className="mt-2 rounded-xl border border-natural-200 bg-natural-100 p-2 opacity-0 shadow-sm group-open:opacity-100 group-open:animate-in group-open:slide-in-from-bottom-10">
            Requires a computer running an operating system. The computer must
            have some memory and ideally some kind of long-term storage. An
            input device as well as some form of output device is recommended.
          </p>
        </details>
      </Element.Preview>
    </Element.Wrapper>
  );
}

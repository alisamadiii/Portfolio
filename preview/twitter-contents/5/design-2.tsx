import React from "react";

import * as Element from "@/components/TwitterContentsElement";

export default function TwitterContents5Design2() {
  return (
    <Element.Wrapper>
      <Element.Preview className="block min-h-60">
        <details className="group">
          <summary className="w-fit cursor-pointer rounded-lg border border-blue-700 bg-blue-600 p-3 text-white duration-200 group-open:rounded-b-none">
            System Requirements
          </summary>
          <p className="rounded-xl rounded-tl-none border border-natural-200 bg-natural-100 p-2 shadow-sm">
            Requires a computer running an operating system. The computer must
            have some memory and ideally some kind of long-term storage. An
            input device as well as some form of output device is recommended.
          </p>
        </details>
      </Element.Preview>
    </Element.Wrapper>
  );
}

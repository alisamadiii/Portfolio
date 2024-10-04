import React, { useRef, useState } from "react";

import * as Element from "@/components/TwitterContentsElement";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";

export default function TwitterContents5() {
  const [open, setOpen] = useState(false);

  const detailsRef = useRef<HTMLDetailsElement>(null);

  const codeString = `<details${open ? " open" : ""}>
    <summary>System Requirements</summary>
    <p>
        Requires a computer running an operating system. The computer must
        have some memory and ideally some kind of long-term storage. An
        input device as well as some form of output device is recommended.
    </p>
</details>`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="html">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview className="block min-h-48">
        <details ref={detailsRef} open={open} onToggle={() => setOpen(!open)}>
          <summary>System Requirements</summary>
          <p>
            Requires a computer running an operating system. The computer must
            have some memory and ideally some kind of long-term storage. An
            input device as well as some form of output device is recommended.
          </p>
        </details>
      </Element.Preview>
      {/* <Element.Settings className="flex flex-wrap gap-2">
        {initialPositions.map((p) => (
          <Button
            key={p}
            variant={position === p ? "default" : "outline"}
            className="duration-0"
            onClick={() => setPosition(p)}
          >
            {p}
          </Button>
        ))}
      </Element.Settings> */}
    </Element.Wrapper>
  );
}

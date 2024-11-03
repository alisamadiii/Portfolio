import React from "react";

import * as Element from "@/components/TwitterContentsElement";

import { Input } from "@/components/ui/input";

export default function TwitterContents12() {
  return (
    <Element.Wrapper>
      <Element.Preview>
        <Input type="number" className="text-[16px]" inputMode="numeric" />
      </Element.Preview>
    </Element.Wrapper>
  );
}

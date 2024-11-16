import React from "react";
import * as Element from "@/components/TwitterContentsElement";

export default function TwitterContent16() {
  return (
    <Element.Wrapper>
      <Element.Preview>
        <label className="flex cursor-pointer items-center gap-2">
          checkbox
          <input type="checkbox" id="checkbox" className="peer hidden" />
          <span className="flex h-7 w-[46px] items-center rounded-full bg-[rgba(120,120,128,0.16)] transition-all duration-200 before:inline-block before:h-[21px] before:w-[21px] before:translate-x-1 before:rounded-[10px] before:bg-[rgb(120,120,128)] before:transition-all before:duration-200 before:content-[''] peer-checked:bg-blue-500 peer-checked:before:translate-x-[21px] before:peer-checked:bg-white" />
        </label>
      </Element.Preview>
    </Element.Wrapper>
  );
}

import React from "react";
import * as Element from "@/components/TwitterContentsElement";

type Props = {};

export default function TwitterContent17({}: Props) {
  return (
    <Element.Wrapper>
      <Element.Preview>
        <div
          className="flex size-48 cursor-pointer items-center justify-center rounded-3xl border bg-natural-200"
          style={{
            cursor: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="%23FFF" stroke="%23000" stroke-width="2" stroke-linejoin="round" d="M18 14.88 8.16 3.15c-.26-.31-.76-.12-.76.28v15.31c0 .36.42.56.7.33l3.1-2.6 1.55 4.25c.08.22.33.34.55.26l1.61-.59a.43.43 0 0 0 .26-.55l-1.55-4.25h4.05c.36 0 .56-.42.33-.7Z"></path></svg>'), pointer`,
          }}
        >
          Hover me
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}

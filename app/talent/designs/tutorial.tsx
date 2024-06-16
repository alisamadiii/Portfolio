"use client";

import Checkbox from "@/components/checkbox";
import Wrapper from "@/components/designs/wrapper";
import React, { useState } from "react";

const headings = ["title 1", "title 2", "title 3"];

export default function Tutorial() {
  const [active, setActive] = useState(false);

  return (
    <Wrapper className="h-auto justify-start gap-8 py-12">
      <nav className="fixed left-0 top-0 flex h-16 w-full items-center justify-center bg-gray-100">
        Navbar
      </nav>
      <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2">
        {headings.map((heading) => (
          <a
            key={heading}
            href={`#${heading}`}
            className="underline hover:text-blue-500"
          >
            {heading}
          </a>
        ))}
      </div>
      <ul className="mx-auto w-full max-w-xl space-y-12">
        {headings.map((heading) => (
          <li key={heading}>
            <h1
              id={heading}
              className="mb-8 text-4xl font-bold capitalize"
              style={{ scrollMarginTop: active ? 80 : 0 }}
            >
              {heading}
            </h1>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia
              vitae possimus odit, amet recusandae esse tempore provident, sed
              quo perferendis quod delectus repellendus illum minima tenetur
              molestiae voluptas asperiores praesentium! Nemo ducimus mollitia
              quia hic facere tenetur eaque earum inventore soluta odio
              similique, velit temporibus ipsam deleniti cum ipsum non, at aut
              quasi? Velit culpa molestias ducimus sequi veritatis veniam? Atque
              sunt facere necessitatibus aspernatur quae beatae nostrum dolor
              reprehenderit officiis quas saepe enim accusantium, eius, eaque
              eligendi voluptatibus assumenda vero recusandae nesciunt
              voluptatum sequi! Saepe vel quae rem. Sit. Eius, voluptatum! Unde
              earum quidem fuga temporibus iusto. Nemo odit adipisci, obcaecati
              error sed minus doloremque dolor laboriosam perferendis quia
              veniam rerum neque nihil unde illum omnis, officia quidem nobis.
              Dolore ullam nobis accusamus ea neque, perferendis sapiente
              aliquid dolor esse odio, quidem soluta omnis dolores labore
              possimus quia. Dolorem sed quod, nisi ipsam doloribus autem fuga
              labore dolorum neque? Magni, quis, numquam soluta cum vero esse,
              sint temporibus culpa libero sapiente aperiam ipsum magnam maxime
              officiis molestias ipsam fugit eos pariatur totam et odit nam
              expedita veritatis! Doloribus, similique. Blanditiis enim officiis
              magni dolor! Dolore nisi delectus aspernatur, necessitatibus
              perferendis minima ut fugiat quia architecto velit libero nam
              asperiores fugit eos incidunt voluptatum reprehenderit provident
              sunt.
            </p>
          </li>
        ))}
      </ul>

      <footer className="fixed bottom-0 left-0 flex h-16 w-full items-center justify-center bg-white/80 backdrop-blur-sm">
        <label className="flex items-center justify-center gap-2">
          <Checkbox
            variant={"square"}
            onChange={({ target }) => setActive(target.checked)}
          />
          scroll-margin-top: &lt;your-value&gt;px
        </label>
      </footer>
    </Wrapper>
  );
}

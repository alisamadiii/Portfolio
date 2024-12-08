import React from "react";
import * as Element from "@/components/TwitterContentsElement";
import { files } from "@/lib/utils";

export default function TwitterContent21() {
  return (
    <Element.Wrapper>
      <Element.Preview className="block max-h-64 overflow-auto">
        <div className="h-dvh w-full">
          <div
            className="relative h-80 w-full"
            style={{
              backgroundAttachment: "fixed",
              backgroundImage: `url(${files.image["gladiator"]})`,
              backgroundSize: "cover",
              backgroundPosition: "top",
            }}
          />
          <h1 className="mt-4 text-3xl font-bold">Fixed Background</h1>
          <p className="mt-4 text-gray-600">
            The background image stays fixed while the content scrolls, creating
            a parallax-like effect.
          </p>
          <div className="mt-8 space-y-4">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p>
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}

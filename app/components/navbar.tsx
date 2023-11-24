"use client";

import React, { Suspense } from "react";
import { NavItems } from "./nav-items";

const navItems = {
  "/": {
    name: "home",
  },
  "/blog": {
    name: "blog",
  },
  "/service": {
    name: "service",
  },
};
export default function Navbar() {
  return (
    <nav className="-ml-3 mb-16 flex max-w-2xl">
      <Suspense fallback={null}>
        {Object.entries(navItems).map(([path, { name }], index) => {
          return <NavItems key={index} path={path} name={name} />;
        })}
      </Suspense>
    </nav>
  );
}

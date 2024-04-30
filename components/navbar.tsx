"use client";

import React, { Suspense } from "react";
import { NavItems } from "./nav-items";
import { usePathname } from "next/navigation";

const navItems = {
  "/": {
    name: "home",
  },
  "/blog": {
    name: "blog",
  },
  // "/service": {
  //   name: "service",
  // },
};
export default function Navbar() {
  const pathname = usePathname();

  return (
    <div
      className={`mx-auto mt-16 max-w-2xl ${pathname.includes("/talent") ? "hidden" : "block  max-md:px-4"}`}
    >
      <nav className="-ml-3 mb-16 flex max-w-2xl">
        <Suspense fallback={null}>
          {Object.entries(navItems).map(([path, { name }], index) => {
            return <NavItems key={index} path={path} name={name} />;
          })}
        </Suspense>
      </nav>
    </div>
  );
}

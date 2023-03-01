import Link from "next/link";
import React from "react";

type Props = {};

export default function Navbar({}: Props) {
  return (
    <nav className="flex flex-wrap gap-3 my-8">
      <Link
        href={"/"}
        className={`inline-block px-6 py-[5px] rounded-md bg-[#E1E1E1] shadow-button`}
      >
        About
      </Link>
      <Link href={"/blogs"} className={`inline-block px-6 py-[5px] rounded-md`}>
        blogs
      </Link>
      <Link
        href={"/projects"}
        className={`inline-block px-6 py-[5px] rounded-md`}
      >
        projects
      </Link>
      <Link
        href={"/testimonial"}
        className={`inline-block px-6 py-[5px] rounded-md`}
      >
        testimonial
      </Link>
      <Link
        href={"/contact"}
        className={`inline-block px-6 py-[5px] rounded-md`}
      >
        contact
      </Link>
    </nav>
  );
}

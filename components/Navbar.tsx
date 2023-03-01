import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

type Props = {};

export default function Navbar({}: Props) {
  const router = useRouter();

  return (
    <nav className="flex flex-wrap gap-3 my-8 mb-6">
      <Link
        href={"/"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/" && "bg-[#E1E1E1] shadow-button"
        }`}
      >
        about
      </Link>
      <Link
        href={"/blogs"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname.includes("/blogs") && "bg-[#E1E1E1] shadow-button"
        }`}
      >
        blogs
      </Link>
      <Link
        href={"/projects"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/projects" && "bg-[#E1E1E1] shadow-button"
        }`}
      >
        projects
      </Link>
      <Link
        href={"/testimonial"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/testimonial" && "bg-[#E1E1E1] shadow-button"
        }`}
      >
        testimonial
      </Link>
      <Link
        href={"/contact"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/contact" && "bg-[#E1E1E1] shadow-button"
        }`}
      >
        contact
      </Link>
    </nav>
  );
}

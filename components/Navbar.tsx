import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTheme } from "next-themes";

type Props = {};

import { BsFillMoonFill } from "react-icons/bs";
import { FiSun } from "react-icons/fi";

export default function Navbar({}: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (theme == "light") {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    }
    if (theme == "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, [theme]);

  return (
    <nav className="flex flex-wrap gap-3 my-8 mb-6">
      <Link
        href={"/"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/" && "bg-primary shadow-button dark:bg-secondary"
        }`}
      >
        about
      </Link>
      <Link
        href={"/blogs"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname.includes("/blogs") &&
          "bg-primary shadow-button dark:bg-secondary"
        }`}
      >
        blogs
      </Link>
      <Link
        href={"/projects"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/projects" &&
          "bg-primary shadow-button dark:bg-secondary"
        }`}
      >
        projects
      </Link>
      <Link
        href={"/testimonial"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/testimonial" &&
          "bg-primary shadow-button dark:bg-secondary"
        }`}
      >
        testimonial
      </Link>
      <Link
        href={"/contact"}
        className={`inline-block px-6 py-[5px] rounded-md duration-200 ${
          router.pathname == "/contact" &&
          "bg-primary shadow-button dark:bg-secondary"
        }`}
      >
        contact
      </Link>
      <button
        onClick={() => setTheme(theme == "light" ? "dark" : "light")}
        className="relative flex items-center justify-center w-8 h-8 overflow-hidden duration-150 border-2 rounded-md focus:shadow-theme"
      >
        <FiSun
          className={`absolute ${
            darkMode == true ? "translate-x-0" : "-translate-x-10"
          } duration-150`}
        />
        <BsFillMoonFill
          className={`absolute ${theme == "light" && "translate-x-0"} ${
            darkMode == false ? "translate-x-0" : "translate-x-10"
          } duration-150`}
        />
      </button>
    </nav>
  );
}

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface Props {
  path: string;
  name: string;
}

export const NavItems = ({ path, name }: Props) => {
  let usePathName = usePathname() || "/";

  if (usePathName.includes("/blog/")) {
    usePathName = "/blog";
  } else if (usePathName.includes("/service/")) {
    usePathName = "/service";
  }

  const isActive = path === usePathName;

  return (
    <Link
      href={path}
      className={`relative px-2 py-1 capitalize focus:text-white focus:outline-none ${
        isActive ? "text-white" : "text-muted"
      }`}
    >
      <p>{name}</p>
      {isActive && (
        <motion.div
          layoutId="navItem"
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
          }}
          className="absolute bottom-0 left-0 h-px w-full bg-white"
        />
      )}
    </Link>
  );
};

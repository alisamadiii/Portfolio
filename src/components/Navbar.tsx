import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Props = {};

import Container from "@/layout/Container";

import Logo from "@/assets/logo.jpg";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";

export default function Navbar({}: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full h-16 bg-light-blue/50 backdrop-blur-md border-b-2`}
    >
      <Container className="flex items-center h-full gap-12">
        <Link href={"/"}>
          <Image
            src={Logo}
            width={100}
            height={100}
            alt="logo"
            className="w-10 rounded-full"
          />
        </Link>
        <ul className="hidden gap-8 md:flex">
          <Link href={"/#about"} scroll={false} className="font-medium">
            About
          </Link>
          <Link href={"/#projects"} scroll={false} className="font-medium">
            Projects
          </Link>
          <Link href={"/#products"} scroll={false} className="font-medium">
            Products
          </Link>
          <Link href={"/blog"} scroll={false} className="font-medium">
            Blogs
          </Link>
        </ul>
        <ul className="hidden ml-auto md:block">
          <Link
            href={"/chat-community"}
            className="px-4 py-2 font-medium text-white border-b rounded-md bg-gradient-to-tr from-primary to-secondary"
          >
            Chat Now
          </Link>
        </ul>
        <div
          className="ml-auto text-xl md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <AiOutlineMenu />
        </div>
      </Container>
      <AnimatePresence mode="sync">
        {isOpen && <Links_SmallScreen setIsOpen={setIsOpen} />}
      </AnimatePresence>
    </nav>
  );
}

type Links_SmallScreen_Props = {
  setIsOpen: (a: boolean) => void;
};

export function Links_SmallScreen({ setIsOpen }: Links_SmallScreen_Props) {
  return (
    <div className="absolute inset-0 w-full h-screen bg-light-blue md:hidden">
      <div className="flex items-center justify-between w-full px-4 py-2 border-b-2 border-dark-blue/20">
        <Link href={"/"}>
          <Image
            src={Logo}
            width={100}
            height={100}
            alt="logo"
            className="w-12 rounded-full"
          />
        </Link>
        <div className="text-xl" onClick={() => setIsOpen(false)}>
          <AiOutlineClose />
        </div>
      </div>
      <ul className="flex flex-col w-full text-base">
        <motion.li
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.5, type: "spring" }}
          onClick={() => setIsOpen(false)}
        >
          <Link
            href={"/#about"}
            scroll={false}
            className="inline-block w-full px-4 py-2 font-medium border-b"
          >
            About
          </Link>
        </motion.li>
        <motion.li
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
          onClick={() => setIsOpen(false)}
        >
          <Link
            href={"/#projects"}
            scroll={false}
            className="inline-block w-full px-4 py-2 font-medium border-b"
          >
            Projects
          </Link>
        </motion.li>
        <motion.li
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
          onClick={() => setIsOpen(false)}
        >
          <Link
            href={"/#products"}
            scroll={false}
            className="inline-block w-full px-4 py-2 font-medium border-b"
          >
            Products
          </Link>
        </motion.li>
        <motion.li
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.5, type: "spring", delay: 0.3 }}
          onClick={() => setIsOpen(false)}
        >
          <Link
            href={"/blog"}
            scroll={false}
            className="inline-block w-full px-4 py-2 font-medium border-b"
          >
            Blogs
          </Link>
        </motion.li>
      </ul>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Props = {};

import Container from "@/layout/Container";

import Logo from "@/assets/logo.jpg";
import {
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineTwitter,
  AiFillLinkedin,
  AiFillGithub,
} from "react-icons/ai";
import { IoIosArrowDown } from "react-icons/io";
import { SiGumroad, SiHashnode } from "react-icons/si";

export default function Navbar({}: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSocialMedia, setIsSocialMedia] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(true); // True: Visible || False: Not Visible

  useEffect(() => {
    isOpen
      ? (document.body.style.overflow = "hidden")
      : (document.body.style.overflow = "auto");
  });

  const SOCIAL_MEDIA = [
    {
      id: 1,
      name: "Twitter",
      icon: AiOutlineTwitter,
      link: "https://twitter.com/Ali_Developer05",
    },
    {
      id: 2,
      name: "LinkedIn",
      icon: AiFillLinkedin,
      link: "https://www.linkedin.com/in/alireza17/",
    },
    {
      id: 3,
      name: "GitHub",
      icon: AiFillGithub,
      link: "https://github.com/AliReza1083",
    },
  ];

  useEffect(() => {
    let prevScroll = window.pageYOffset;

    window.addEventListener("scroll", (e) => {
      const currentScroll = window.pageYOffset;

      prevScroll > currentScroll ? setIsScrolled(true) : setIsScrolled(false);

      prevScroll = currentScroll;
    });
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full h-16 bg-light-blue/50 backdrop-blur-md border-b-2 duration-200 ${
        isScrolled ? "-translate-y-0" : "-translate-y-full"
      }`}
    >
      <Container className="flex items-center h-full gap-12">
        <div className="flex items-center gap-1">
          <Link href={"/"}>
            <Image
              src={Logo}
              width={100}
              height={100}
              alt="logo"
              className="w-10 rounded-full"
            />
          </Link>
          <div
            className="p-1 bg-gray-100 rounded-sm cursor-pointer"
            onClick={() => setIsSocialMedia(!isSocialMedia)}
          >
            <IoIosArrowDown
              className={`duration-200 ${isSocialMedia && "rotate-180"}`}
            />
          </div>
          <AnimatePresence>
            {isSocialMedia && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute top-0 w-full bg-white translate-y-[70px] max-w-[200px] rounded-md shadow-sm border overflow-hidden"
              >
                {SOCIAL_MEDIA.map((socialMedia) => {
                  const Icon = socialMedia.icon;
                  return (
                    <motion.a
                      key={socialMedia.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      href={socialMedia.link}
                      target="_blank"
                      className={`flex items-center gap-2 hover:bg-gray-100 duration-100 p-1 rounded-md m-1`}
                    >
                      <Icon />
                      <p>{socialMedia.name}</p>
                    </motion.a>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ul className="hidden gap-8 md:flex">
          <Link href={"/service"} className="font-medium">
            Service
          </Link>
          <Link
            href={"https://store.alirezasamadi.com/"}
            target="_blank"
            className="flex items-center gap-2 font-medium"
          >
            <SiGumroad />
            Products
          </Link>
          <Link
            href={"https://blog.alirezasamadi.com/"}
            target="_blank"
            className="flex items-center gap-2 font-medium"
          >
            <SiHashnode />
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
          transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
          onClick={() => setIsOpen(false)}
        >
          <Link
            href={"/service"}
            className="inline-block w-full px-4 py-2 font-medium border-b"
          >
            Service
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
            href={"https://store.alirezasamadi.com/"}
            target="_blank"
            className="flex items-center w-full gap-2 px-4 py-2 font-medium border-b"
          >
            <SiGumroad />
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
            className="flex items-center w-full gap-2 px-4 py-2 font-medium border-b"
          >
            <SiHashnode />
            Blogs
          </Link>
        </motion.li>
      </ul>
      <motion.ul
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0, transition: { duration: 0.1 } }}
        transition={{ duration: 0.5, type: "spring", delay: 0.4 }}
        onClick={() => setIsOpen(false)}
        className="p-4"
      >
        <Link
          href={"/chat-community"}
          className="inline-block w-full px-4 py-2 mt-auto font-medium text-center text-white border-b rounded-md bg-gradient-to-tr from-primary to-secondary"
        >
          Chat Now
        </Link>
      </motion.ul>
    </div>
  );
}

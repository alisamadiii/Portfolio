"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, Variants, motion } from "framer-motion";

import { Container } from "./ui/container";
import { Button } from "./ui/button";
import { Text, textVariants } from "./ui/text";
import { Box } from "./ui/box";

// Icons
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { IoIosArrowDown } from "react-icons/io";

import { ServiceINITIAL_VALUE } from "@/lib/data";
import { ServicePopupAnimation } from "@/lib/animation";

type Props = {};

export default function Navbar({}: Props) {
  const [isNavbar, setIsNavbar] = useState(false);
  const [isScrollNavbar, setIsScrollNavbar] = useState(false);
  const [isService, setIsService] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrollNavbar(scrollPosition >= 300);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isScrollNavbar]);

  console.log(isScrollNavbar);

  return (
    <>
      <nav className="absolute top-0 left-0 z-50 w-full h-16 bg-background isolate">
        <Container
          size={"2xl"}
          className="flex items-center justify-between h-full"
        >
          {/* Logo */}
          <div className="md:hidden"></div>
          <ul
            className={`absolute top-16 left-0 bg-background flex flex-col md:flex-row md:items-center w-full max-md:h-[calc(100dvh-64px)] duration-500 px-6 md:px-0 md:w-auto md:gap-11 md:static max-md:-z-10 ${
              isNavbar
                ? "max-md:translate-y-0"
                : "max-md:-translate-y-[calc(100%+64px)]"
            }`}
          >
            <li className="mb-4 md:hidden">
              <Button size={"md"} className="w-full text-center">
                Chat now
              </Button>
            </li>
            <li
              className={textVariants({
                variant: "muted-sm",
                className:
                  "relative text-base md:text-sm border-b md:border-none",
              })}
              onClick={() => setIsService(!isService)}
            >
              <span className="flex items-center h-12 gap-2 duration-100 cursor-pointer md:h-auto text-foreground md:text-accents-6 hover:text-accents-7">
                Service
                <IoIosArrowDown
                  className={`duration-200 transition-transform ${
                    isService ? "rotate-180" : "rotate-0"
                  }`}
                />
              </span>
              <AnimatePresence>
                {isService && (
                  <Box
                    variants={ServicePopupAnimation}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="flex p-2 max-md:rounded-none md:mb-auto md:w-[628px] max-md:border-none max-md:p-0 duration-0 md:absolute max-md:[--height-from:0px] max-md:[--height-to:auto] md:[--rotateX-from:-30deg] md:[--rotateX-to:0deg] md:[--scale-from:0.9] md:[--scale-to:1] md:[--y-from:24px] md:[--opacity-from:0] md:[--opacity-to:1]"
                  >
                    {ServiceINITIAL_VALUE.map((value) => (
                      <Link
                        key={value.id}
                        href={"#"}
                        className="items-center w-full duration-200 rounded-none max-md:h-12 max-md:flex md:rounded-lg md:p-4 hover:bg-link-hover"
                      >
                        <Text className="flex items-center gap-2 text-base md:text-sm text-accents-6 md:text-foreground">
                          {value.icon}
                          {value.title}
                        </Text>
                        <Text
                          size={14}
                          variant={"muted-sm"}
                          className="font-light max-md:hidden"
                        >
                          {value.description}
                        </Text>
                      </Link>
                    ))}
                  </Box>
                )}
              </AnimatePresence>
            </li>
            <li
              className={textVariants({
                variant: "muted-sm",
                className:
                  "flex items-center text-base md:text-sm border-b md:border-none hover:text-accents-7 h-12 md:h-auto duration-100 cursor-pointer",
              })}
            >
              <a href="#" target={"_blank"}>
                Blog
              </a>
            </li>
            <li
              className={textVariants({
                variant: "muted-sm",
                className:
                  "flex items-center text-base md:text-sm border-b md:border-none hover:text-accents-7 h-12 md:h-auto duration-100 cursor-pointer",
              })}
            >
              <a href="#" target={"_blank"}>
                Products
              </a>
            </li>
          </ul>
          <Button className="text-sm max-md:hidden">Chat now</Button>
          <div
            className="p-1 overflow-hidden border rounded-full cursor-pointer bg-background text-accents-6 md:hidden"
            onClick={() => setIsNavbar(!isNavbar)}
          >
            <AnimatePresence initial={false} mode="wait">
              {isNavbar ? (
                <motion.p
                  key={"close"}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <AiOutlineClose />
                </motion.p>
              ) : (
                <motion.p
                  key={"open"}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <AiOutlineMenu />
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </Container>
      </nav>

      <AnimatePresence>{isScrollNavbar && <ScrollNavbar />}</AnimatePresence>
    </>
  );
}

const ScrollNavAnimation: Variants = {
  hidden: {
    scale: "var(--scale-from, 100%)",
    x: "var(--y-from, -50%)",
  },
  visible: {
    scale: "var(--scale-to, 100%)",
  },
  exit: {
    scale: "var(--scale-from, 100%)",
  },
};

function ScrollNavbar() {
  const INITIAL_VALUE = [
    { id: 1, name: "about", link: "#about" },
    { id: 2, name: "project", link: "#project" },
    { id: 3, name: "experience", link: "#experience" },
  ];

  const [currentSection, setCurrentSection] = useState("about");

  return (
    <motion.nav
      // variants={ScrollNavAnimation}
      // initial="hidden"
      // animate="visible"
      // exit="exit"
      className="fixed z-50 grid grid-cols-3 p-1 -translate-x-1/2 border rounded-full max-md:text-sm w-80 max-md:bottom-4 md:top-4 left-1/2 bg-black/80 backdrop-blur-sm [--scale-from:0%] [--scale-to:100%]"
    >
      {INITIAL_VALUE.map((value) => (
        <a
          key={value.id}
          className={`relative inline-block py-2 text-center capitalize rounded-full isolate`}
          onClick={() => setCurrentSection(value.name)}
        >
          {value.name}
          {currentSection == value.name && (
            <motion.div
              layoutId="scroll-nav"
              className="absolute inset-0 rounded-full bg-accents-2/60 -z-10"
            />
          )}
        </a>
      ))}
    </motion.nav>
  );
}

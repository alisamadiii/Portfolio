"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { Container } from "./ui/container";
import { buttonVariants } from "./ui/button";
import { Text, textVariants } from "./ui/text";
import { Box } from "./ui/box";

// Icons
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { IoIosArrowDown } from "react-icons/io";

import { ServiceInitialValue } from "@/lib/data";
import { ServicePopupAnimation } from "@/lib/animation";
import { useToast } from "./ui/use-toast";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isNavbar, setIsNavbar] = useState(false);
  const [isScrollNavbar, setIsScrollNavbar] = useState(false);
  const [isService, setIsService] = useState(false);

  const pathName = usePathname();

  const { toast } = useToast();

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

  const UnderConstruction = () => {
    toast({
      title: "Under Construction",
      description: "",
      variant: "destructive",
    });
  };

  return (
    <>
      <nav className="absolute left-0 top-0 isolate z-50 h-16 w-full bg-background/40 backdrop-blur-sm">
        <Container
          size={"2xl"}
          className="flex h-full items-center justify-between"
        >
          {/* Logo */}
          <div className="md:hidden"></div>
          <ul
            className={`absolute left-0 top-16 flex w-full flex-col bg-background px-6 duration-500 max-md:-z-10 max-md:h-[calc(100dvh-64px)] md:static md:w-auto md:flex-row md:items-center md:gap-11 md:px-0 ${
              isNavbar
                ? "max-md:translate-y-0"
                : "max-md:-translate-y-[calc(100%+64px)]"
            }`}
          >
            <li className="mb-4 md:hidden">
              <Link
                href={"/"}
                onClick={UnderConstruction}
                className={buttonVariants({
                  size: "lg",
                  className: "w-full text-center text-background",
                })}
              >
                Chat now
              </Link>
            </li>
            <li
              className={textVariants({
                variant: "muted-sm",
                className:
                  "relative border-b text-base md:border-none md:text-sm",
              })}
              onClick={() => {
                setIsService(!isService);
              }}
            >
              <span className="flex h-12 cursor-pointer items-center gap-2 text-foreground duration-100 hover:text-accents-7 md:h-auto md:text-accents-6">
                Service
                <IoIosArrowDown
                  className={`transition-transform duration-200 ${
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
                    className="flex p-2 duration-0 max-md:rounded-none max-md:border-none max-md:p-0 max-md:[--height-from:0px] max-md:[--height-to:auto] md:absolute md:mb-auto md:w-[628px] md:[--opacity-from:0] md:[--opacity-to:1] md:[--rotateX-from:-30deg] md:[--rotateX-to:0deg] md:[--scale-from:0.9] md:[--scale-to:1] md:[--y-from:24px]"
                  >
                    {ServiceInitialValue.map((value) => (
                      <Link
                        key={value.id}
                        href={"/service/building-website"}
                        className="w-full items-center rounded-none duration-200 hover:bg-link-hover max-md:flex max-md:h-12 md:rounded-lg md:p-4"
                      >
                        <Text className="flex items-center gap-2 text-base text-accents-6 md:text-sm md:text-foreground">
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
                  "flex h-12 cursor-pointer items-center border-b text-base duration-100 hover:text-accents-7 md:h-auto md:border-none md:text-sm",
              })}
            >
              <a
                href="https://blog.alirezasamadi.com/"
                target={"_blank"}
                rel="noreferrer"
              >
                Blog
              </a>
            </li>
            <li
              className={textVariants({
                variant: "muted-sm",
                className:
                  "flex h-12 cursor-pointer items-center border-b text-base duration-100 hover:text-accents-7 md:h-auto md:border-none md:text-sm",
              })}
            >
              <a
                href="https://store.alirezasamadi.com/"
                target={"_blank"}
                rel="noreferrer"
              >
                Products
              </a>
            </li>
          </ul>
          <Link
            href={"/"}
            onClick={UnderConstruction}
            className={buttonVariants({
              className: "text-sm text-background max-md:hidden",
            })}
          >
            Chat now
          </Link>
          <div
            className="cursor-pointer overflow-hidden rounded-full border bg-background p-1 text-accents-6 md:hidden"
            onClick={() => {
              setIsNavbar(!isNavbar);
            }}
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

      <AnimatePresence>
        {isScrollNavbar && pathName === "/" && <ScrollNavbar />}
      </AnimatePresence>
    </>
  );
}

// const ScrollNavAnimation: Variants = {
//   hidden: {
//     scale: "var(--scale-from, 100%)",
//     x: "var(--y-from, -50%)",
//   },
//   visible: {
//     scale: "var(--scale-to, 100%)",
//   },
//   exit: {
//     scale: "var(--scale-from, 100%)",
//   },
// };

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
      className="fixed left-1/2 z-50 grid w-80 -translate-x-1/2 grid-cols-3 rounded-full border bg-black/80 p-1 backdrop-blur-sm [--scale-from:0%] [--scale-to:100%] max-md:bottom-4 max-md:text-sm md:top-4"
    >
      {INITIAL_VALUE.map((value) => (
        <a
          key={value.id}
          href={value.link}
          className={`relative isolate inline-block rounded-full py-2 text-center capitalize`}
          onClick={() => {
            setCurrentSection(value.name);
          }}
        >
          {value.name}
          {currentSection === value.name && (
            <motion.div
              layoutId="scroll-nav"
              className="absolute inset-0 -z-10 rounded-full bg-accents-2/60"
            />
          )}
        </a>
      ))}
    </motion.nav>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, Variants, motion } from "framer-motion";

import { Container } from "./ui/container";
import { Button } from "./ui/button";
import { Text, textVariants } from "./ui/text";
import { ChevronDown, Menu, X } from "lucide-react";
import { Box } from "./ui/box";

type Props = {};

const ServiceINITIAL_VALUE = [
  {
    id: 1,
    title: "Building Website",
    description: "Crafting captivating, functional websites.",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10.335 10.0035C10.166 9.4835 9.6785 9.1 9.1 9.1H8.45V7.15C8.45 6.97761 8.38152 6.81228 8.25962 6.69038C8.13772 6.56848 7.97239 6.5 7.8 6.5H3.9V5.2H5.2C5.37239 5.2 5.53772 5.13152 5.65962 5.00962C5.78152 4.88772 5.85 4.72239 5.85 4.55V3.25H7.15C7.49478 3.25 7.82544 3.11304 8.06924 2.86924C8.31304 2.62544 8.45 2.29478 8.45 1.95V1.6835C9.22771 1.99704 9.91786 2.49436 10.4614 3.13289C11.0049 3.77143 11.3856 4.53216 11.5709 5.34996C11.7562 6.16777 11.7405 7.01829 11.5253 7.82873C11.31 8.63917 10.9016 9.38538 10.335 10.0035ZM5.85 11.6545C3.2825 11.336 1.3 9.152 1.3 6.5C1.3 6.097 1.352 5.707 1.4365 5.3365L4.55 8.45V9.1C4.55 9.44478 4.68696 9.77544 4.93076 10.0192C5.17456 10.263 5.50522 10.4 5.85 10.4M6.5 0C5.64641 0 4.80117 0.168127 4.01256 0.494783C3.22394 0.821439 2.50739 1.30023 1.90381 1.90381C0.684819 3.12279 0 4.77609 0 6.5C0 8.22391 0.684819 9.87721 1.90381 11.0962C2.50739 11.6998 3.22394 12.1786 4.01256 12.5052C4.80117 12.8319 5.64641 13 6.5 13C8.22391 13 9.87721 12.3152 11.0962 11.0962C12.3152 9.87721 13 8.22391 13 6.5C13 5.64641 12.8319 4.80117 12.5052 4.01256C12.1786 3.22394 11.6998 2.50739 11.0962 1.90381C10.4926 1.30023 9.77606 0.821439 8.98744 0.494783C8.19883 0.168127 7.35359 0 6.5 0Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

const ServicePopupAnimation: Variants = {
  hidden: {
    rotateX: "var(--rotateX-from, 0)",
    scale: "var(--scale-from, 1)",
    y: "var(--y-from, 0px)",
    opacity: "var(--opacity-from, 1)",
    height: "var(--height-from)",
  },
  visible: {
    rotateX: "var(--rotateX-to, 0)",
    scale: "var(--scale-to, 1)",
    opacity: "var(--opacity-to, 1)",
    height: "var(--height-to)",
  },
  exit: {
    rotateX: "var(--rotateX-from, 0)",
    scale: "var(--scale-from, 1)",
    y: "var(--y-from, 0px)",
    opacity: "var(--opacity-from, 1)",
    height: "var(--height-from)",
  },
};

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
                <ChevronDown
                  size={14}
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
                  <X size={18} />
                </motion.p>
              ) : (
                <motion.p
                  key={"open"}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Menu size={18} />
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
      variants={ScrollNavAnimation}
      initial="hidden"
      animate="visible"
      exit="exit"
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

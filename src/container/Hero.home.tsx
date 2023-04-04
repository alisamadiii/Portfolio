import React, { useContext, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { AnimatePresence } from "framer-motion";

import { DropDown_List, Heading1 } from "@/components";
import Container from "@/layout/Container";

import { LINKS } from "@/contents/Links";
import { Navbar_Context } from "@/context/Navbar_Context";

import { FiChevronDown } from "react-icons/fi";
import { AiOutlineTwitter } from "react-icons/ai";

type Props = {};

export default function Hero({}: Props) {
  const [isMenu, setIsMenu] = useState<boolean>(false);
  const { setIsButton } = useContext(Navbar_Context);

  const { ref, inView } = useInView();

  useEffect(() => {
    inView == true ? setIsButton(false) : setIsButton(true);
  }, [inView]);

  return (
    <>
      <div className="scale-x-110 absolute top-0 left-0 w-full h-full -translate-y-[100px] md:rounded-b-[20%] lg:rounded-b-[100%] bg-light-blue-2 -z-50 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-t from-primary to-secondary blur-3xl opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-pattern"></div>
      </div>
      <Container className="flex flex-col items-center justify-center gap-4">
        <a
          href="https://twitter.com/Ali_Developer05"
          target="_blank"
          className="flex items-center gap-2 px-4 py-1 font-bold duration-150 rounded-full text-twitter bg-twitter/10 hover:bg-twitter hover:text-white"
        >
          <AiOutlineTwitter />
          <span>Twitter</span>
        </a>
        <Heading1>Ali Reza</Heading1>
        <p className="mb-4 text-base font-medium text-center md:text-lg">
          I have a strong foundation in HTML, CSS, and JavaScript, and I am
          skilled in creating <br /> interactive and visually appealing
          websites.
        </p>
        <div className="space-y-4">
          <div
            className="w-48 flex items-center justify-between gap-4 px-4 py-2 font-medium duration-150 bg-white border-2 rounded-lg active:!scale-95 cursor-pointer"
            onClick={() => setIsMenu(!isMenu)}
            ref={ref}
          >
            <span>Menu</span>
            <span className={`${isMenu && "rotate-180"} duration-200`}>
              <FiChevronDown />
            </span>
          </div>
          <AnimatePresence>
            {isMenu && <DropDown_List className="absolute w-48" data={LINKS} />}
          </AnimatePresence>
        </div>
      </Container>
    </>
  );
}

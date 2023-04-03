import React, { useContext, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";

type Props = {};

import Container from "@/layout/Container";
import { Navbar_Context } from "@/context/Navbar_Context";

import Logo from "@/assets/logo.jpg";
import { FiChevronDown } from "react-icons/fi";
import DropDown_List from "./DropDown_List";
import { LINKS } from "@/contents/Links";

const ButtonVariants: Variants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  exit: { scale: 0.5, opacity: 0 },
};

export default function Navbar({}: Props) {
  const { isButton } = useContext(Navbar_Context);
  const [isMenu, setIsMenu] = useState<boolean>(false);

  return (
    <nav className="fixed top-0 left-0 z-50 w-full h-20 bg-light-blue/50 backdrop-blur-md">
      <Container className="flex items-center justify-between h-full">
        <Image
          src={Logo}
          width={100}
          height={100}
          alt="Logo Image"
          className="w-12 rounded-full"
        />
        <AnimatePresence>
          {isButton && (
            <div className="relative">
              <motion.div
                variants={ButtonVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center gap-4 px-4 py-2 font-medium duration-150 bg-white border-2 rounded-lg active:!scale-95 cursor-pointer"
                onClick={() => setIsMenu(!isMenu)}
              >
                <span>Menu</span>
                <span className={`${isMenu && "rotate-180"} duration-200`}>
                  <FiChevronDown />
                </span>
              </motion.div>

              <AnimatePresence>
                {isMenu && (
                  <DropDown_List
                    className="absolute right-0 w-56 translate-y-3"
                    data={LINKS}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </Container>
    </nav>
  );
}

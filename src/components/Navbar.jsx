import React, { useState } from "react";

import Logo from "../assets/Logo.png";
import { AiFillGithub, AiFillTwitterCircle } from "react-icons/ai";
import { RiMenu3Fill } from "react-icons/ri";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-dark bg-opacity-70 backdrop-blur-md border-b-2 border-light-20 z-50">
      <div className="w-full h-full max-w-[1536px] mx-auto px-4 md:px-16 lg:px-24 flex justify-between items-center">
        <img src={Logo} width="34px" height="34px" alt="logo" />

        <ul
          className={`flex items-center gap-4 md:gap-8 text-link responsive__navbar ${
            isOpen ? "navbar__active" : ""
          }`}>
          <a
            href="#about"
            className="w-full hover:bg-[#222222] md:hover:bg-opacity-0 py-2 px-4 md:p-0 rounded-md hover:text-light"
            onClick={() => setIsOpen(!isOpen)}
            id="link">
            About
          </a>
          <a
            href="#projects"
            className="w-full hover:bg-[#222222] md:hover:bg-opacity-0 py-2 px-4 md:p-0 rounded-md hover:text-light"
            onClick={() => setIsOpen(!isOpen)}
            id="link">
            Projects
          </a>
          <a
            href="#contents"
            className="w-full hover:bg-[#222222] md:hover:bg-opacity-0 py-2 px-4 md:p-0 rounded-md hover:text-light"
            onClick={() => setIsOpen(!isOpen)}
            id="link">
            Contents
          </a>
          <li className="flex gap-2 md:gap-4 text-3xl md:text-2xl mx-auto md:mx-0 mt-8 md:mt-0">
            <a
              href="https://github.com/AliReza1083"
              target={"_blank"}
              className="w-full hover:bg-[#222222] md:hover:bg-opacity-0 py-2 px-4 md:p-0 rounded-md hover:text-light"
              id="link"
              onClick={() => setIsOpen(!isOpen)}
              rel="noreferrer">
              <AiFillGithub />
            </a>
            <a
              href="https://twitter.com/Ali_Developer05"
              target={"_blank"}
              className="w-full hover:bg-[#222222] md:hover:bg-opacity-0 py-2 px-4 md:p-0 rounded-md hover:text-light"
              id="link"
              onClick={() => setIsOpen(!isOpen)}
              rel="noreferrer">
              <AiFillTwitterCircle />
            </a>
          </li>
        </ul>

        <RiMenu3Fill
          className="text-2xl block md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>
    </div>
  );
};

export default Navbar;

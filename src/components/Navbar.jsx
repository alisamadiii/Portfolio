import React from "react";

import Logo from "../../public/Logo.png";
import { AiFillGithub, AiFillTwitterCircle } from "react-icons/ai";

const Navbar = () => {
  return (
    <div className="w-full h-16 border-b-2 border-light-20">
      <div className="w-full h-full max-w-[1536px] mx-auto px-24 flex justify-between items-center">
        <img src={Logo} width="34px" height="34px" alt="" />

        <ul className="flex items-center gap-8 text-link">
          <a href="#" className="hover:text-light">
            About
          </a>
          <a href="#" className="hover:text-light">
            Projects
          </a>
          <a href="#" className="hover:text-light">
            Contents
          </a>
          <li className="flex gap-4 text-2xl">
            <a href="#" className="hover:text-light">
              <AiFillGithub />
            </a>
            <a href="#" className="hover:text-light">
              <AiFillTwitterCircle />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;

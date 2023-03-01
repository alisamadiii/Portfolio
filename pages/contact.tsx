import React from "react";

type Props = {};

import { AiFillLinkedin } from "react-icons/ai";
import { FiArrowUpRight } from "react-icons/fi";

export default function Contact({}: Props) {
  return (
    <div className="mt-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Interested in having me build something for you? Feel free to connect
        with me on LinkedIn to discuss your project further.
      </h1>
      <a
        href="https://www.linkedin.com/in/alireza17"
        target={"_blank"}
        aria-label="Check out my LinkedIn profile"
        className="w-[176px] p-4 text-2xl flex justify-between border-2 mt-8 text-[#525252] rounded-lg border-social-media hover:bg-[#EFEFEF] duration-100"
      >
        <AiFillLinkedin />
        <FiArrowUpRight />
      </a>
    </div>
  );
}

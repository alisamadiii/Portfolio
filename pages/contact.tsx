import HeadTag from "@/components/Head";
import React from "react";

type Props = {};

import { AiFillLinkedin } from "react-icons/ai";
import { FiArrowUpRight } from "react-icons/fi";

export default function Contact({}: Props) {
  return (
    <>
      <HeadTag title="Contact" />
      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Interested in having me build something for you? Feel free to connect
          with me on LinkedIn to discuss your project further.
        </h1>
        <a
          href="https://www.linkedin.com/in/alireza17"
          target={"_blank"}
          aria-label="Check out my LinkedIn profile"
          className="w-[176px] mt-8 p-4 text-2xl flex justify-between border-2 rounded-lg border-social-media hover:bg-[#EFEFEF] dark:hover:bg-[#1b1b1b] duration-100"
        >
          <AiFillLinkedin />
          <FiArrowUpRight />
        </a>
      </div>
    </>
  );
}

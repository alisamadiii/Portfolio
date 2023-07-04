import React from "react";
import Image from "next/image";
import Link from "next/link";

import Logo from "@/assets/logo.jpg";
import { BiLeftArrowAlt } from "react-icons/bi";

type Props = {};

export default function Header({}: Props) {
  return (
    <header className="z-20 flex items-center p-2 text-2xl text-white bg-primary">
      <Link href={"/"}>
        <BiLeftArrowAlt />
      </Link>
      <Image
        src={Logo}
        width={100}
        height={100}
        alt="logo"
        className="w-8 rounded-full"
      />
      <small className="ml-2 font-medium">Community Chat</small>
    </header>
  );
}

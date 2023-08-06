import React from "react";
import Button from "../Button";
import Link from "next/link";
import { RiUser3Fill, RiUser3Line } from "react-icons/ri";
import { IoIosList, IoIosListBox } from "react-icons/io";
import { MdWork, MdWorkOutline } from "react-icons/md";
import { useRouter } from "next/router";

type Props = {};

export default function NavbarSmall({}: Props) {
  const { route } = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 z-50 grid items-center w-full grid-cols-5 px-4 pt-1 bg-white border-t border-tweet-hover md:hidden">
      <Link href={"/"}>
        <Button className={`${route == "/" && "font-semibold"}`}>
          {route == "/" ? (
            <RiUser3Fill className="text-xl" />
          ) : (
            <RiUser3Line className="text-xl" />
          )}
        </Button>
      </Link>
      <Link href={"/lists"}>
        <Button className={`${route == "/lists" && "font-semibold"}`}>
          {route == "/lists" ? (
            <IoIosListBox className="text-xl" />
          ) : (
            <IoIosList className="text-xl" />
          )}
        </Button>
      </Link>
      <Link href={"/work"}>
        <Button className={`${route == "/work" && "font-semibold"}`}>
          {route == "/work" ? (
            <MdWork className="text-xl" />
          ) : (
            <MdWorkOutline className="text-xl" />
          )}
        </Button>
      </Link>
      <Button
        variant={"primary"}
        className="col-span-2 py-1"
        onClick={() =>
          window.open("https://twitter.com/Ali_Developer05")?.focus()
        }
      >
        <p className="">Sponsor</p>
      </Button>
    </nav>
  );
}

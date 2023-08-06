import React from "react";
import Button from "../Button";

type Props = {};

import { RiUser3Fill, RiUser3Line } from "react-icons/ri";
import { IoIosList, IoIosListBox } from "react-icons/io";
import { MdWorkOutline, MdWork } from "react-icons/md";
import { SiGithubsponsors } from "react-icons/si";
import { useRouter } from "next/router";
import Link from "next/link";
import NavbarSmall from "./NavbarSmall";

export default function Navbar({}: Props) {
  const { route } = useRouter();

  return (
    <>
      <nav className="fixed top-0 flex-col items-center hidden gap-6 pt-1 xl:items-start md:flex md:sticky xl:w-60 h-96">
        <Button className="p-4">
          <svg
            width="25"
            height="22"
            viewBox="0 0 25 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.1138 0H22.8353L14.7049 9.2925L24.2696 21.9375H16.7794L10.9136 14.2684L4.20187 21.9375H0.478125L9.17437 11.9981L0 0H7.67812L12.9803 7.00987L19.1115 0H19.1138ZM17.8076 19.71H19.8698L6.55875 2.1105H4.34587L17.8076 19.71Z"
              fill="black"
            />
          </svg>
        </Button>
        <ul>
          <Link href={"/"}>
            <Button className={`${route == "/" && "font-semibold"}`}>
              {route == "/" ? (
                <RiUser3Fill className="text-3xl" />
              ) : (
                <RiUser3Line className="text-3xl" />
              )}
              <p className="hidden mr-3 xl:block">Profile</p>
            </Button>
          </Link>
          <Link href={"/lists"}>
            <Button className={`${route == "/lists" && "font-semibold"}`}>
              {route == "/lists" ? (
                <IoIosListBox className="text-3xl" />
              ) : (
                <IoIosList className="text-3xl" />
              )}
              <p className="hidden mr-3 xl:block">Lists</p>
            </Button>
          </Link>
          <Link href={"/work"}>
            <Button className={`${route == "/work" && "font-semibold"}`}>
              {route == "/work" ? (
                <MdWork className="text-3xl" />
              ) : (
                <MdWorkOutline className="text-3xl" />
              )}
              <p className="hidden mr-3 xl:block">My Work</p>
            </Button>
          </Link>
        </ul>
        <Button
          variant={"primary"}
          onClick={() =>
            window.open("https://twitter.com/Ali_Developer05")?.focus()
          }
        >
          <p className="hidden xl:block">Sponsor</p>
          <SiGithubsponsors className="text-3xl xl:hidden" />
        </Button>
      </nav>

      <NavbarSmall />
    </>
  );
}

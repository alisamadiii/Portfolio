import React from "react";
import Button from "../Button";

type Props = {};

import { BiSolidUser, BiUser } from "react-icons/bi";
import { IoIosList, IoIosListBox } from "react-icons/io";
import { MdWorkOutline, MdWork } from "react-icons/md";
import { SiGithubsponsors } from "react-icons/si";

export default function Navbar({}: Props) {
  return (
    <>
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
        <Button className="font-semibold">
          <BiSolidUser className="text-3xl" />
          <p className="hidden mr-3 xl:block">Profile</p>
        </Button>
        <Button>
          <IoIosList className="text-3xl" />
          <p className="hidden mr-3 xl:block">Lists</p>
        </Button>
        <Button>
          <MdWorkOutline className="text-3xl" />
          <p className="hidden mr-3 xl:block">My Work</p>
        </Button>
      </ul>
      <Button variant={"primary"}>
        <p className="hidden xl:block">Sponsor</p>
        <SiGithubsponsors className="text-3xl xl:hidden" />
      </Button>
    </>
  );
}

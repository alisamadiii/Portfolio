import { FaUserAlt, FaLaptopCode, FaBlog } from "react-icons/fa";
import { TbMessage2 } from "react-icons/tb";
import { MdOutlineConnectWithoutContact } from "react-icons/md";

import { IconType } from "react-icons";

export type LinksType = {
  id: number;
  name: string;
  icon: IconType;
  href: string;
}[];

export const LINKS: LinksType = [
  {
    id: 1,
    name: "About",
    icon: FaUserAlt,
    href: "#about",
  },
  {
    id: 2,
    name: "Projects",
    icon: FaLaptopCode,
    href: "#projects",
  },
  {
    id: 3,
    name: "Blogs",
    icon: FaBlog,
    href: "#",
  },
  {
    id: 4,
    name: "Testimonial",
    icon: TbMessage2,
    href: "#",
  },
  {
    id: 5,
    name: "Contact",
    icon: MdOutlineConnectWithoutContact,
    href: "#",
  },
];

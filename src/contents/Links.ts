import { FaUserAlt, FaLaptopCode, FaBlog } from "react-icons/fa";
import { TbMessage2 } from "react-icons/tb";
import { MdOutlineConnectWithoutContact } from "react-icons/md";
import { AiOutlineShoppingCart } from "react-icons/ai";

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
    href: "#blogs",
  },
  {
    id: 4,
    name: "Products",
    icon: AiOutlineShoppingCart,
    href: "#products",
  },
  {
    id: 5,
    name: "Testimonial",
    icon: TbMessage2,
    href: "#",
  },
  {
    id: 6,
    name: "Contact",
    icon: MdOutlineConnectWithoutContact,
    href: "#",
  },
];

import { FaUserAlt, FaLaptopCode, FaBlog } from "react-icons/fa";
import { TbMessage2 } from "react-icons/tb";
import { MdOutlineConnectWithoutContact } from "react-icons/md";

import { IconType } from "react-icons";

type LinksType = { id: number; name: string; icon: IconType }[];

export const LINKS: LinksType = [
  {
    id: 1,
    name: "About",
    icon: FaUserAlt,
  },
  {
    id: 2,
    name: "Projects",
    icon: FaLaptopCode,
  },
  {
    id: 3,
    name: "Blogs",
    icon: FaBlog,
  },
  {
    id: 4,
    name: "Testimonial",
    icon: TbMessage2,
  },
  {
    id: 5,
    name: "Contact",
    icon: MdOutlineConnectWithoutContact,
  },
];

import { IconType } from "react-icons";

import { BiWorld } from "react-icons/bi";
import { AiOutlineTwitter, AiFillGithub } from "react-icons/ai";
import { FaProductHunt } from "react-icons/fa";

type ProjectsType = {
  id: number;
  name: string;
  logo: any;
  description: string;
  website: string;
  github: string;
  product_hunt: null | string;
  twitter: null | string;
  links: { id: number; name: string; icon: IconType; href: string }[];
}[];

export type ProjectType = {
  id: number;
  name: string;
  logo: any;
  description: string;
  website: string;
  github: string;
  product_hunt: null | string;
  twitter: null | string;
  links: { id: number; name: string; icon: IconType; href: string }[];
};

import AniLearnLogo from "../assets/AniLearn.svg";

export const PROJECTS: ProjectsType = [
  {
    id: 1,
    name: "AniLearn.dev",
    description:
      "We offer top-notch content for easy learning, with clear visual development principles.",
    logo: AniLearnLogo,
    website: "https://www.anilearn.dev/",
    github: "https://github.com/AliReza1083/AniLearn.dev",
    product_hunt: null,
    twitter: null,
    links: [
      {
        id: 1,
        name: "Website",
        icon: BiWorld,
        href: "https://www.anilearn.dev",
      },
      {
        id: 2,
        name: "GitHub",
        icon: AiFillGithub,
        href: "https://github.com/AliReza1083/AniLearn.dev",
      },
      // {
      //   id: 3,
      //   name: "Product Hunt",
      //   icon: FaProductHunt,
      //   href: "#",
      // },
      // {
      //   id: 3,
      //   name: "Twitter",
      //   icon: AiOutlineTwitter,
      //   href: "#",
      // },
    ],
  },
  {
    id: 2,
    name: "",
    description: "",
    logo: "",
    website: "",
    github: "",
    product_hunt: null,
    twitter: null,
    links: [
      {
        id: 1,
        name: "",
        icon: BiWorld,
        href: "",
      },
    ],
  },
];

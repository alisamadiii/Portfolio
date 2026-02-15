import { Github, Linkedin, XIcon } from "../icons/social";

export const company = {
  name: "AliSamadii.LLC",
  description:
    "SOFTWARE DEVELOPMENT, SAAS PRODUCTS, AND ONLINE TECHNOLOGY SERVICES.",
  email: "a@alisamadii.com",
  disclaimer: "All rights reserved.",
  social: [
    { icon: XIcon, href: "https://x.com/alisamadii_", label: "X" },
    { icon: XIcon, href: "https://x.com/alisamadi__", label: "X" },
    {
      icon: Linkedin,
      href: "https://www.linkedin.com/in/alireza17/",
      label: "Linkedin",
    },
    { icon: Github, href: "https://github.com/alisamadiii", label: "Github" },
  ],
  websites: [
    { label: "Docs", href: "https://docs.alisamadii.com" },
    { label: "Motion", href: "https://motion.alisamadii.com" },
    { label: "Packages", href: "https://packages.alisamadii.com" },
  ],
  clients: [
    { label: "Crosspost", href: "/client/crosspost" },
    { label: "Bless", href: "https://bless.network" },
    { label: "Area", href: "https://www.area.club" },
    { label: "B402", href: "https://www.b402.ai" },
  ],
  resume: "https://personal-work-ali.s3.us-west-2.amazonaws.com/alisamadi.pdf",
  myImage:
    "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/my-image.png",
};

export const urls = {
  portfolio:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://alisamadii.com",
  admin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://admin.alisamadii.com",
  motion:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3002"
      : "https://motion.alisamadii.com",
  docs:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3003"
      : "https://docs.alisamadii.com",
};

export const logos = {
  default:
    "https://imagedelivery.net/19uF4EgtqW8tG7X6wLHBKQ/3a8970cd-3208-425c-f485-3822f6390e00/public",
  black:
    "https://imagedelivery.net/19uF4EgtqW8tG7X6wLHBKQ/2958c060-bad2-4695-3121-3b84d337d800/public",
  blue: "https://imagedelivery.net/19uF4EgtqW8tG7X6wLHBKQ/c06e1b15-0a9b-4386-950c-4182016bd100/public",
  yellow:
    "https://imagedelivery.net/19uF4EgtqW8tG7X6wLHBKQ/4bdf9ec4-1820-4f4f-cb7a-b843502b7300/public",
  purple:
    "https://imagedelivery.net/19uF4EgtqW8tG7X6wLHBKQ/9dfbc466-d7af-4102-c07b-205591b28600/public",
  green:
    "https://imagedelivery.net/19uF4EgtqW8tG7X6wLHBKQ/1938f058-d389-4579-95af-8f40f234e700/public",
};

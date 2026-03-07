import { z } from "zod";

import { Github, Linkedin, XIcon } from "../icons/social";

export const company = {
  name: "AliSamadii.LLC",
  description:
    "SOFTWARE DEVELOPMENT, SAAS PRODUCTS, AND ONLINE TECHNOLOGY SERVICES.",
  email: "a@alisamadii.com",
  agencyEmail: "agency@alisamadii.com",
  phone: "+1 (971) 382-8969",
  location: "Portland, OR",
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
  agency:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3004"
      : "https://agency.alisamadii.com",
};

export const logos = {
  default: "https://cdn.alisamadii.com/company/business-logo.png",
  black: "https://cdn.alisamadii.com/company/business-logo-black.png",
  blue: "https://cdn.alisamadii.com/company/business-logo-blue.png",
  yellow: "https://cdn.alisamadii.com/company/business-logo-yellow.png",
  purple: "https://cdn.alisamadii.com/company/business-logo-purple.png",
  green: "https://cdn.alisamadii.com/company/business-logo-green.png",
};

export const PROJECT_ZOD = z.enum(["motion", "agency"]);
export type Project = z.infer<typeof PROJECT_ZOD>;

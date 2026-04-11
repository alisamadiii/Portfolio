import { ProjectType } from "@workspace/drizzle/schema";

import { Github, Linkedin, XIcon } from "../icons/social";

export const company = {
  name: "Ali Samadii LLC",
  description:
    "SOFTWARE DEVELOPMENT, SAAS PRODUCTS, AND ONLINE TECHNOLOGY SERVICES.",
  email: "a@alisamadii.com",
  agencyEmail: "agency@alisamadii.com",
  ownerName: "Ali Samadi",
  phone: "+1 (971) 382-8969",
  location: "Portland, OR",
  website: "alisamadii.com",
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
    { label: "Agency", href: "https://agency.alisamadii.com" },
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

export const urls: Record<Lowercase<ProjectType>, string> = {
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
  template:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3005"
      : "https://template.alisamadii.com",
  portal:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3006"
      : "https://portal.alisamadii.com",
};

export const logos = {
  default: "https://cdn.alisamadii.com/company/business-logo.png",
  black: "https://cdn.alisamadii.com/company/business-logo-black.png",
  blue: "https://cdn.alisamadii.com/company/business-logo-blue.png",
  yellow: "https://cdn.alisamadii.com/company/business-logo-yellow.png",
  purple: "https://cdn.alisamadii.com/company/business-logo-purple.png",
  green: "https://cdn.alisamadii.com/company/business-logo-green.png",
};

export const projectsData: {
  name: ProjectType;
  logo: string;
  description: string;
  soon?: boolean;
  link?: string;
}[] = [
  {
    name: "MOTION",
    logo: logos.blue,
    description: "A production-ready motion library for React",
    link: urls.motion,
  },
  {
    name: "AGENCY",
    logo: logos.green,
    description: "A production-ready agency website for your business",
    link: urls.agency,
  },
  {
    name: "DOCS",
    logo: logos.yellow,
    description: "A website to add useful information",
    link: urls.docs,
  },
  {
    name: "TEMPLATE",
    logo: logos.black,
    description: "A template for starting a new project",
    soon: true,
  },
];

import type React from "react";

import { type Metadata } from "next";

interface Props {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Contact Form",
  description:
    "As a front-end developer, I specialize in building and maintaining the user interface of web applications.",
};

export default function Layout({ children }: Props) {
  return children;
}

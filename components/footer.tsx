"use client";

import React from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Magnetic from "./magnetic";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  return (
    <footer
      className={`mx-auto my-16 max-w-2xl ${pathname.includes("/talent") ? "hidden" : "block max-md:px-4"}`}
    >
      <div className="mb-1 flex gap-3">
        <Magnetic>
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-2xl text-muted hover:text-foreground"
          >
            <FaGithub />
          </a>
        </Magnetic>

        <Magnetic>
          <a
            href={process.env.NEXT_PUBLIC_LINKEDIN_URL}
            target="_blank"
            rel="noreferrer"
            className="text-2xl text-muted hover:text-foreground"
          >
            <FaLinkedin />
          </a>
        </Magnetic>
        <Magnetic>
          <a
            href={process.env.NEXT_PUBLIC_TWITTER_URL}
            target="_blank"
            rel="noreferrer"
            className="text-2xl text-muted hover:text-foreground"
          >
            <FaXTwitter />
          </a>
        </Magnetic>
      </div>
      <small className="text-muted">
        Developed by{" "}
        <a href={process.env.NEXT_PUBLIC_TWITTER_URL} className="text-muted-3">
          Ali Reza
        </a>
      </small>
    </footer>
  );
}

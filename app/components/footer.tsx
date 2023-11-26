import { Github, Linkedin } from "lucide-react";
import React from "react";

export default function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-2xl">
      <div className="flex gap-4">
        <a
          href="https://github.com/AliReza1083/"
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-foreground"
        >
          <Github />
        </a>
        <a
          href="https://www.linkedin.com/in/alireza17/"
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-foreground"
        >
          <Linkedin />
        </a>
        <a
          href="https://twitter.com/alirdev"
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-foreground"
        >
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 512 512"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            className="w-6"
          >
            <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
          </svg>
        </a>
      </div>
      <small className="text-muted">
        Developer by{" "}
        <a href="https://twitter.com/alirdev" className="text-muted-3">
          Ali Reza
        </a>
      </small>
    </footer>
  );
}

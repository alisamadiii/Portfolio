"use client";

import { Github, Instagram, Linkedin, Send, Twitter } from "lucide-react";

import { GridCell } from "@/components/grid-cell";

const NAV_LINKS = ["Home", "Services", "About", "Contact"];
const SERVICE_LINKS = [
  "Web Development",
  "UI/UX Design",
  "Brand Identity",
  "SEO & Analytics",
  "Digital Marketing",
];

const SOCIAL_ICONS = [Twitter, Github, Linkedin, Instagram];

export function FooterSection() {
  return (
    <footer>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <GridCell className="lg:col-span-1">
          <a
            href="#"
            className="font-heading mb-4 inline-block text-xl font-bold tracking-tight"
          >
            ALI<span className="text-primary">.</span>SAMADII
          </a>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            A creative agency focused on building exceptional digital
            experiences that drive real results.
          </p>
          <div className="flex gap-3">
            {SOCIAL_ICONS.map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="border-border text-muted-foreground hover:text-primary hover:border-primary/30 flex h-9 w-9 items-center justify-center border transition-all duration-300"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </GridCell>

        <GridCell>
          <h4 className="text-muted-foreground mb-6 font-mono text-xs tracking-[0.2em] uppercase">
            Navigation
          </h4>
          <ul className="space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link}>
                <a
                  href={`#${link.toLowerCase()}`}
                  className="text-foreground/70 hover:text-primary group inline-flex items-center gap-2 text-sm transition-colors duration-300"
                >
                  <span className="bg-primary h-px w-0 transition-all duration-300 group-hover:w-4" />
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </GridCell>

        <GridCell>
          <h4 className="text-muted-foreground mb-6 font-mono text-xs tracking-[0.2em] uppercase">
            Services
          </h4>
          <ul className="space-y-3">
            {SERVICE_LINKS.map((service) => (
              <li key={service}>
                <a
                  href="#services"
                  className="text-foreground/70 hover:text-primary group inline-flex items-center gap-2 text-sm transition-colors duration-300"
                >
                  <span className="bg-primary h-px w-0 transition-all duration-300 group-hover:w-4" />
                  {service}
                </a>
              </li>
            ))}
          </ul>
        </GridCell>

        <GridCell>
          <h4 className="text-muted-foreground mb-6 font-mono text-xs tracking-[0.2em] uppercase">
            Newsletter
          </h4>
          <p className="text-foreground/70 mb-4 text-sm">
            Get the latest updates, tips, and insights delivered to your inbox.
          </p>
          <div className="flex">
            <input
              type="email"
              placeholder="your@email.com"
              className="border-border focus:border-primary/50 placeholder:text-muted-foreground/50 flex-1 border bg-transparent px-4 py-2.5 text-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled
            />
            <button className="border-border hover:bg-primary hover:border-primary hover:text-primary-foreground flex h-11 w-11 items-center justify-center border border-l-0 transition-all duration-300">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </GridCell>
      </div>

      <GridCell className="!py-5">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-muted-foreground text-xs">
            &copy; 2026 Ali Samadii Agency. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {/* <a
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Terms of Service
            </a> */}
          </div>
        </div>
      </GridCell>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { animations } from "@/animations/registry";
import { useTheme } from "next-themes";

import { Button } from "@workspace/ui/components/button";
import { Logo } from "@workspace/ui/icons/logo";
import { Github, Linkedin, XIcon } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

const animationList = Object.entries(animations).map(([key, anim]) => ({
  name: anim.name,
  href: `/m/${key}`,
}));

const col1 = animationList.slice(0, Math.ceil(animationList.length / 2));
const col2 = animationList.slice(Math.ceil(animationList.length / 2));

const socials = [
  { icon: XIcon, href: "https://x.com/alisamadii_", label: "X" },
  {
    icon: Linkedin,
    href: "https://www.linkedin.com/in/alireza17/",
    label: "LinkedIn",
  },
  { icon: Github, href: "https://github.com/alisamadiii", label: "GitHub" },
];

export function MotionFooter() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  if (pathname?.startsWith("/m/")) return null;

  return (
    <footer className="border-border mt-20 border-t">
      <div className="container px-6 py-12 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1fr_1fr_auto]">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="text-primary inline-block size-8">
              <Logo className="size-full" />
            </Link>
            <p className="text-muted-foreground max-w-xs text-sm">
              Production-grade animated React components. Source code only.
            </p>
            <div className="flex items-center gap-1 pt-1">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Components col 1 */}
          <div>
            <h3 className="text-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              Components
            </h3>
            <ul className="space-y-2">
              {col1.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Components col 2 */}
          <div>
            <h3 className="text-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              More
            </h3>
            <ul className="space-y-2">
              {col2.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links & theme */}
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
              Links
            </h3>
            <a
              href="#components"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Browse All
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Pricing
            </a>
            <a
              href="mailto:a@alisamadii.com"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Contact
            </a>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-xs"
              >
                {theme === "dark" ? "Light" : "Dark"} mode
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 md:flex-row">
          <p className="text-muted-foreground text-xs">
            © 2026 Ali Samadii LLC. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="https://alisamadii.com/privacy"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Privacy
            </a>
            <a
              href="https://alisamadii.com/terms"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

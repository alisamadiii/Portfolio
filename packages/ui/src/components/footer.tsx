"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import { Logo } from "../icons/logo";
import { company } from "../lib/company";

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export interface FooterLegal {
  category: string;
  href: string;
  subLinks?: { label: string; href: string }[];
}

export interface FooterProps {
  className?: string;
  columns?: FooterColumn[];
  legal?: FooterLegal[];
  standaloneLinks?: { label: string; href: string }[];
  copyright?: string;
  companyName?: string;
  description?: string;
  email?: string;
  disclaimer?: string;
  curatedBy?: { label: string; href?: string };
  hide?: string[];
  isPortfolio?: boolean;
}

const defaultColumns: FooterColumn[] = [
  {
    heading: "Company and team",
    links: [{ label: "Experience", href: "#" }],
  },
  {
    heading: "Websites",
    links: company.websites,
  },
  {
    heading: "Client",
    links: company.clients,
  },
];

const defaultLegal: FooterLegal[] = [
  { category: "Privacy policy", href: "/privacy" },
  { category: "Terms of Service", href: "/terms" },
];

function Footer({
  className,
  columns = defaultColumns,
  legal = defaultLegal,
  standaloneLinks,
  copyright,
  companyName = company.name,
  description = company.description,
  email = company.email,
  disclaimer,
  hide,
  isPortfolio,
}: FooterProps) {
  const year = "2026";
  const copyrightText = copyright ?? `© ${year} ${companyName}`;

  const pathname = usePathname();

  if (hide?.some((h) => pathname?.startsWith(h) && h !== "/")) return null;

  return (
    <footer
      className={cn("bg-muted/60 text-foreground mt-20 w-full", className)}
    >
      {/* Top section: navigation columns */}
      <div className="container px-6 py-12 md:px-8">
        {isPortfolio && (
          <>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {columns.map((col) => (
                <nav key={col.heading} className="flex flex-col gap-4">
                  <h3 className="text-foreground font-semibold">
                    {col.heading}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
              {/* Follow us column with social icons */}
              <nav className="flex flex-col">
                <h3 className="text-foreground font-semibold">Follow me</h3>
                <ul className="flex items-center gap-2">
                  {company.social.map(({ icon: Icon, href, label }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        aria-label={label}
                        className="text-muted-foreground hover:text-foreground rounded-full p-2 transition-colors"
                      >
                        <Icon className="size-7" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <Separator className="my-8" />
          </>
        )}

        {/* Middle section: logo + description + legal */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="text-primary inline-block size-10 shrink-0 [&_svg]:size-full [&_svg]:h-auto"
              aria-label="Home"
            >
              <Logo />
            </Link>
            {description && (
              <p className="text-muted-foreground max-w-xs text-xs font-medium tracking-wide uppercase">
                {description}
              </p>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                {email}
              </a>
            )}
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
              {legal.map((item) => (
                <Link
                  key={item.category}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                >
                  {item.category}
                </Link>
              ))}
              {standaloneLinks?.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          {!isPortfolio && (
            <nav className="flex flex-col">
              <h3 className="text-foreground font-semibold">Follow me</h3>
              <ul className="flex items-center gap-2">
                {company.social.map(({ icon: Icon, href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      aria-label={label}
                      className="text-muted-foreground hover:text-foreground rounded-full p-2 transition-colors"
                    >
                      <Icon className="size-7" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{copyrightText}</p>
          {disclaimer && (
            <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
              {disclaimer}
            </p>
          )}
        </div>
      </div>

      <div className="bg-primary h-12 px-6"></div>
    </footer>
  );
}

export { Footer };

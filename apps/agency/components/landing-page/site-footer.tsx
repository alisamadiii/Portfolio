import Link from "next/link";

import { Separator } from "@workspace/ui/components/separator";
import { Logo } from "@workspace/ui/icons/logo";

const footerLinks = {
  services: [
    { label: "Admin Panels", href: "#services" },
    { label: "Web Development", href: "#services" },
    { label: "Managed Hosting", href: "#services" },
    { label: "Business Email", href: "#services" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Process", href: "#process" },
    { label: "Contact", href: "#booking" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-border/50 bg-card/30 border-t">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo className="text-primary mb-4 size-10" />
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-primary">Ali</span>Samadii
            </Link>
            <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
              Web development agency specializing in custom websites, admin
              panels, hosting, and digital solutions for businesses of all
              sizes.
            </p>
            <a
              href="mailto:a@alisamadii.com"
              className="text-muted-foreground hover:text-foreground mt-3 inline-block text-sm transition-colors"
            >
              a@alisamadii.com
            </a>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider uppercase">
              Services
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.services.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider uppercase">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.company.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-muted-foreground text-xs">
            &copy; 2026 AliSamadii.LLC. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      <div className="via-primary h-1 bg-linear-to-r from-transparent to-transparent" />
    </footer>
  );
}

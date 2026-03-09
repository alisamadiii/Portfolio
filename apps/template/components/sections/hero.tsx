// app/(marketing)/_sections/hero.tsx
import {
  ArrowRight,
  CreditCard,
  FileText,
  Github,
  Layers,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

const stackBadges = [
  "Next.js 16 + React 19",
  "Expo / React Native",
  "Better Auth",
  "Polar Payments",
  "Drizzle ORM + Neon",
  "tRPC",
  "Turborepo",
  "shadcn/ui + Tailwind 4",
];

export function Hero() {
  return (
    <section className="relative isolate">
      {/* Background gradient orbs */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="bg-primary/5 absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-32 pb-20 text-center lg:pt-40 lg:pb-28">
        {/* Eyebrow */}
        <Badge
          variant="secondary"
          className="mb-6 gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
        >
          <Layers className="size-3.5" />5 apps · 7 packages · One monorepo
        </Badge>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-5xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Ship Your SaaS in{" "}
          <span className="from-primary to-primary bg-gradient-to-r via-violet-500 bg-clip-text text-transparent">
            Days, Not Months
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
          Authentication, payments, admin panel, mobile app, docs site — all
          wired together in one monorepo. Stop rebuilding boilerplate. Start
          building your product.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" className="h-12 gap-2 px-8 text-base">
            Get the Template
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 gap-2 px-8 text-base"
          >
            <Github className="size-4" />
            View Demo
          </Button>
        </div>

        {/* Social proof */}
        <div className="text-muted-foreground mt-8 flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-1.5">
            <Layers className="size-4" />5 production apps
          </span>
          <span className="bg-border hidden h-4 w-px sm:block" />
          <span className="flex items-center gap-1.5">
            <Zap className="size-4" />
            30+ tRPC procedures
          </span>
          <span className="bg-border hidden h-4 w-px sm:block" />
          <span className="flex items-center gap-1.5">
            <Shield className="size-4" />
            Fully typed
          </span>
        </div>

        {/* Tech badges */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {stackBadges.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="text-muted-foreground rounded-full px-3 py-1 text-xs font-medium"
            >
              {label}
            </Badge>
          ))}
        </div>

        {/* Quick icon row */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          {[
            {
              icon: Shield,
              label: "Auth & Sessions",
              desc: "Email, OAuth, OTP",
            },
            {
              icon: CreditCard,
              label: "Payments",
              desc: "Subscriptions & billing",
            },
            {
              icon: Smartphone,
              label: "Mobile App",
              desc: "Expo + React Native",
            },
            {
              icon: FileText,
              label: "Documentation",
              desc: "Fumadocs + AI-ready",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-card/50 rounded-xl border p-4 text-center backdrop-blur-sm"
            >
              <div className="bg-primary/10 mx-auto mb-2 flex size-10 items-center justify-center rounded-lg">
                <Icon className="text-primary size-5" />
              </div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-muted-foreground text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

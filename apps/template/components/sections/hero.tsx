// app/(marketing)/_sections/hero.tsx
"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CreditCard,
  FileText,
  Layers,
  Shield,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

const stackBadges = [
  "Next.js 16",
  "React 19",
  "Expo",
  "Better Auth",
  "Polar",
  "Drizzle",
  "tRPC",
  "Turborepo",
  "shadcn/ui",
  "Tailwind 4",
];

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-stone-50 to-white dark:from-stone-950 dark:to-stone-900">
      {/* Subtle background elements */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        {/* Soft radial gradient */}
        <div className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-stone-200/40 blur-[120px] dark:bg-stone-800/30" />
        {/* Curved decorative lines */}
        <svg
          className="absolute top-[340px] left-[8%] hidden text-stone-300/60 lg:block dark:text-stone-700/40"
          width="180"
          height="200"
          fill="none"
        >
          <path
            d="M170 0 C170 80, 80 100, 10 200"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
        <svg
          className="absolute top-[340px] right-[8%] hidden text-stone-300/60 lg:block dark:text-stone-700/40"
          width="180"
          height="200"
          fill="none"
        >
          <path
            d="M10 0 C10 80, 100 100, 170 200"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
        {/* Handwritten-style labels on the curves */}
        <span className="absolute top-[350px] left-[6%] hidden -rotate-12 font-serif text-sm text-stone-400 italic lg:block dark:text-stone-600">
          Authentication
        </span>
        <span className="absolute top-[350px] right-[6%] hidden rotate-12 font-serif text-sm text-stone-400 italic lg:block dark:text-stone-600">
          Payments
        </span>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        {/* ── Text content ── */}
        <div className="text-center">
          <h1
            className={`mx-auto max-w-4xl text-5xl leading-[1.08] font-bold tracking-tight text-balance text-stone-900 transition-all duration-700 sm:text-6xl lg:text-7xl dark:text-stone-50 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Ship your SaaS with a streamlined monorepo
          </h1>

          {/* Email CTA */}
          <div
            className={`mx-auto mt-10 flex max-w-md flex-col items-center gap-3 transition-all delay-100 duration-700 sm:flex-row ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-12 flex-1 rounded-xl border-stone-200 bg-white text-base shadow-sm dark:border-stone-700 dark:bg-stone-800"
            />
            <Button
              size="lg"
              className="h-12 gap-2 rounded-xl bg-stone-900 px-6 text-base font-semibold text-white shadow-lg shadow-stone-900/20 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:shadow-stone-50/10 dark:hover:bg-stone-200"
            >
              Get a demo
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Trust line */}
          <p
            className={`mt-5 flex items-center justify-center gap-2 text-sm text-stone-500 transition-all delay-200 duration-700 dark:text-stone-400 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <ShieldCheck className="size-4" />
            Fully typed, end-to-end. 5 apps, 7 packages, one monorepo.
          </p>
        </div>

        {/* ── Bento grid ── */}
        <div
          className={`mt-16 transition-all delay-300 duration-700 lg:mt-20 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12">
            {/* Card 1 — Auth (large) */}
            <div className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:col-span-3 lg:col-span-4 lg:row-span-2 dark:border-stone-700/80 dark:bg-stone-800/60">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Authentication
                </span>
                <button className="text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300">
                  <svg
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                  <Shield className="size-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Better Auth
                </span>
              </div>

              <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
                Email, OAuth, OTP
              </p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Sessions · RBAC · 2FA
              </p>

              <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                Created from:{" "}
                <span className="font-medium text-stone-600 dark:text-stone-300">
                  Better Auth
                </span>
              </p>

              <div className="mt-6 flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-lg bg-stone-900 text-xs text-white hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  Configure
                </Button>
                <div className="flex gap-1.5 text-stone-400">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700">
                    <Zap className="size-3.5" />
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700">
                    <Layers className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — Speed stat (small) */}
            <div className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-br from-stone-100 to-stone-50 p-6 shadow-sm transition-all hover:shadow-md sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:from-stone-800/80 dark:to-stone-800/40">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  5X
                </span>
                <svg
                  className="mb-1 text-stone-400 dark:text-stone-500"
                  width="32"
                  height="16"
                  viewBox="0 0 32 16"
                  fill="none"
                >
                  <path
                    d="M0 8h6l4-6 4 12 4-8 4 4h10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Ship faster with a pre-configured
                <br />
                monorepo with shared packages.
              </p>
            </div>

            {/* Card 3 — Integrations (stacked cards) */}
            <div className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:col-span-6 lg:col-span-4 lg:row-span-2 dark:border-stone-700/80 dark:bg-stone-800/60">
              <div className="relative h-full min-h-[220px]">
                {/* Background stacked cards */}
                <div className="absolute top-2 right-0 left-4 h-40 rotate-3 rounded-xl border border-stone-200 bg-amber-50/80 dark:border-stone-700 dark:bg-amber-950/20" />
                <div className="absolute top-4 right-2 left-2 h-40 -rotate-2 rounded-xl border border-stone-200 bg-rose-50/80 dark:border-stone-700 dark:bg-rose-950/20" />

                {/* Front card */}
                <div className="relative rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded bg-violet-100 dark:bg-violet-900/30">
                      <CreditCard className="size-3 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      Polar
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-500">Payment received:</p>
                  <p className="mt-0.5 text-sm font-bold text-stone-900 dark:text-stone-50">
                    Pro subscription activated
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    for user@example.com
                  </p>
                  <div className="mt-3 border-t border-stone-100 pt-2 dark:border-stone-700">
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                      Tuesday, 10 Mar
                    </p>
                    <p className="text-xs text-stone-400">
                      9:23 | Webhook processed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 — Shortcuts / DX */}
            <div className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:bg-stone-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Developer Experience
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    Type-safe from DB to UI
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {[
                  {
                    icon: (
                      <Terminal className="size-4 text-stone-600 dark:text-stone-300" />
                    ),
                  },
                  {
                    icon: (
                      <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-300">
                        TS
                      </span>
                    ),
                  },
                  {
                    icon: (
                      <Zap className="size-4 text-stone-600 dark:text-stone-300" />
                    ),
                  },
                  {
                    icon: (
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                        ▶
                      </span>
                    ),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex size-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
                  >
                    {item.icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Card 5 — Mobile */}
            <div className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:bg-stone-800/60">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Smartphone className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Mobile App
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    Expo + React Native sharing auth, API, and types with web.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 6 — Docs */}
            <div className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:bg-stone-800/60">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <FileText className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Documentation
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    Fumadocs with MDX, search, and AI-ready content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tech stack row ── */}
        <div
          className={`mt-12 flex flex-wrap items-center justify-center gap-2 transition-all delay-500 duration-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          {stackBadges.map((label) => (
            <span
              key={label}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

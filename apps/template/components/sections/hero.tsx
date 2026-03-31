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

import { LockPassword } from "@workspace/ui/icons";

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
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        {/* ── Text content ── */}
        <div className="text-center">
          <h1
            className={`mx-auto max-w-4xl text-5xl leading-[1.08] font-bold tracking-tight text-balance text-stone-900 transition-all duration-700 sm:text-6xl lg:text-7xl dark:text-stone-50 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Ship your <span className="font-serif italic">SaaS</span> with a
            streamlined monorepo
          </h1>

          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            Get the complete monorepo template with authentication, payments,
            admin panel, mobile app, and documentation — all production-ready
            and fully typed.
          </p>

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
            <div className="bg-background shadow-card relative overflow-hidden rounded-2xl p-6 transition-all sm:col-span-3 lg:col-span-4 lg:row-span-2">
              <div className="text-3xl font-bold tracking-tight">
                Better Auth
              </div>
              <p className="text-muted-foreground text-sm">Email, OAuth, OTP</p>
              <LockPassword className="text-primary mx-auto mt-8 size-50" />
            </div>

            {/* Card 2 — Speed stat (small) */}
            <div className="group from-primary to-primary/90 text-primary-foreground shadow-dialog relative overflow-hidden rounded-2xl bg-linear-to-b p-6 transition-all sm:col-span-3 lg:col-span-4">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">5X</span>
                <svg
                  className="mb-1"
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
              <p className="mt-3 text-sm leading-relaxed">
                Ship faster with a pre-configured
                <br />
                monorepo with shared packages.
              </p>
            </div>

            {/* Card 3 — Integrations (stacked cards) */}
            <div className="bg-background shadow-card relative overflow-hidden rounded-2xl p-6 transition-all sm:col-span-6 lg:col-span-4 lg:row-span-2">
              <div className="text-3xl font-bold tracking-tight">Polar</div>
              <p className="text-muted-foreground text-sm">
                Payment processing
              </p>
              <div className="mt-8 flex max-h-64 flex-col gap-2 mask-b-from-20">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-background relative rounded-2xl border p-4"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <div className="bg-primary/10 flex size-5 items-center justify-center rounded">
                        <CreditCard className="text-primary size-3" />
                      </div>
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        Polar
                      </span>
                    </div>
                    <p className="text-[10px]">Payment received:</p>
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
                ))}
              </div>
            </div>

            {/* Card 4 — Shortcuts / DX */}
            <div className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 transition-all sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:bg-stone-800/60">
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
            <div className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 transition-all sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:bg-stone-800/60">
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
            <div className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 transition-all sm:col-span-3 lg:col-span-4 dark:border-stone-700/80 dark:bg-stone-800/60">
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

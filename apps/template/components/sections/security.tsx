// app/(marketing)/_sections/security.tsx
import {
  Ban,
  Bot,
  Cookie,
  Gauge,
  Globe,
  KeyRound,
  Lock,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

const securityFeatures = [
  {
    icon: Lock,
    title: "AES-256-GCM encryption",
    description: "Built-in utility for encrypting sensitive data at rest.",
  },
  {
    icon: Cookie,
    title: "Cross-subdomain sessions",
    description:
      "Cookie sessions with 5-minute cache and automatic refresh across subdomains.",
  },
  {
    icon: Smartphone,
    title: "Mobile bearer auth",
    description:
      "expo-secure-store for token storage with bearer header authentication.",
  },
  {
    icon: Gauge,
    title: "Rate limiting",
    description:
      "LRU-based rate limiter on API routes, configurable per procedure.",
  },
  {
    icon: Globe,
    title: "CORS enforcement",
    description: "Explicit allowed origins — no wildcard access.",
  },
  {
    icon: Upload,
    title: "Presigned uploads",
    description:
      "File uploads via presigned URLs — no direct bucket access exposed.",
  },
  {
    icon: Bot,
    title: "AI crawler blocking",
    description:
      "robots.txt blocks GPTBot, CCBot, and other AI crawlers by default.",
  },
  {
    icon: KeyRound,
    title: "Email OTP verification",
    description: "Real 6-digit OTP codes — not guessable magic link tokens.",
  },
  {
    icon: ShieldCheck,
    title: "Admin role enforcement",
    description:
      "Admin access checked at the tRPC middleware level — not just UI.",
  },
  {
    icon: Ban,
    title: "User ban system",
    description:
      "Ban users with reason and optional expiry date — enforced in auth.",
  },
];

export function SecuritySection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Security
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Security Built In, Not Bolted On
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Every layer has protection baked in — from encryption to rate
            limiting to role enforcement.
          </p>
        </div>

        {/* 2-column list */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-x-12 gap-y-6 sm:grid-cols-2">
          {securityFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-4">
                <div className="bg-destructive/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="text-destructive size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

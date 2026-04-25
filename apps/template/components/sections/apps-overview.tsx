// app/(marketing)/_sections/apps-overview.tsx
import {
  BookOpen,
  Check,
  Globe,
  LayoutDashboard,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const apps = [
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    tech: "Next.js · port 3000",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description:
      "Full-featured user dashboard with authentication, settings, and billing.",
    features: [
      "Signup, login, email OTP, password reset, Google OAuth",
      "Profile editing, avatar upload (R2/S3), account deletion",
      "Subscription management with Polar billing portal",
      "Protected routes with session guards",
      "tRPC API layer with rate limiting",
    ],
  },
  {
    icon: ShieldCheck,
    name: "Admin Panel",
    tech: "Next.js · port 3001",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    description:
      "Manage users and payments — connected to Dashboard API.",
    features: [
      "Role-based access (admin role required)",
      "User search, sort, paginate, edit, delete",
      "Products, invoices, and subscriptions overview",
      "Cookie-forwarded HTTP calls — no duplicate backend",
    ],
  },
  {
    icon: Globe,
    name: "Marketing Website",
    tech: "Next.js · port 3002",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    description:
      "SEO-ready marketing site with blog, pricing, and content pages.",
    features: [
      "Hero, Features, FAQs, Testimonials, Pricing sections",
      "Blog pages via Content Collections + MDX",
      "generateMetadata, sitemap, robots.txt",
      "Live pricing pulled from your database",
      "Blocks AI crawlers (GPTBot, CCBot, etc.)",
    ],
  },
  {
    icon: BookOpen,
    name: "Documentation",
    tech: "Fumadocs · port 3003",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "Full-text search docs with AI-ready endpoints on every page.",
    features: [
      "Fumadocs with Orama full-text search",
      "MDX content with syntax highlighting",
      "/llms-full.txt for entire docs as plain text",
      '"Open in ChatGPT / Claude" buttons',
      "OG image generation per doc page",
    ],
  },
  {
    icon: Smartphone,
    name: "Mobile App",
    tech: "Expo 55 · React Native",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    description: "Native mobile app with secure auth, subscriptions, and tRPC.",
    features: [
      "WebView auth with expo-secure-store token storage",
      "Home and Settings tabs with native navigation",
      "Subscription management via Polar portal",
      "Light/dark theme support",
      "Full tRPC integration with bearer auth",
    ],
  },
];

export function AppsOverview() {
  return (
    <section className="bg-muted/30 border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            What&apos;s Inside
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            5 Apps. 7 Packages. One Monorepo.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Every app is production-ready with real features — not TODO stubs.
          </p>
        </div>

        {/* Cards grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Card
                key={app.name}
                className="group relative overflow-hidden transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${app.bg}`}
                    >
                      <Icon className={`size-5 ${app.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {app.tech}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {app.description}
                  </p>
                  <ul className="space-y-2">
                    {app.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="text-primary mt-0.5 size-3.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

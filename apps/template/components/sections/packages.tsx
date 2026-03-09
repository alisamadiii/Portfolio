// app/(marketing)/_sections/packages.tsx
import {
  Check,
  Database,
  Mail,
  Palette,
  Settings,
  Shield,
  Workflow,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

const packages = [
  {
    id: "auth",
    icon: Shield,
    label: "Auth",
    name: "@workspace/auth",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    features: [
      "Better Auth with email/password + Google OAuth",
      "Email OTP verification with real 6-digit codes",
      "Password reset flow with email delivery",
      "Admin plugin with role-based access",
      "Bearer token support for mobile (Expo plugin)",
      "Cross-subdomain cookie sessions (5-min cache, auto-refresh)",
      "Account linking across providers",
      "AES-256-GCM encryption utility built in",
      "Polar customer auto-created on signup",
    ],
  },
  {
    id: "database",
    icon: Database,
    label: "Database",
    name: "@workspace/drizzle",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: [
      "Drizzle ORM with Neon PostgreSQL (serverless)",
      "8 pre-configured tables: user, session, account, verification, products, subscriptions, orders, webhook_events",
      "Products with trial support (configurable interval & count)",
      "Subscriptions with cancellation tracking",
      "Orders with discount amounts and invoice numbers",
      "User metadata (JSONB), ban system, role field",
      "One command to generate, migrate, or push schema",
    ],
  },
  {
    id: "api",
    icon: Workflow,
    label: "API",
    name: "@workspace/trpc",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    features: [
      "End-to-end type-safe API with tRPC",
      "6 routers, 30+ procedures across user, sessions, verification, discounts, payments, admin, upload",
      "Built-in rate limiting (LRU cache, 10 req/min per IP)",
      "Admin procedures with role enforcement",
      "File upload with presigned URLs (R2/S3), 10MB max",
      "HTTP caller for cross-app server-side calls",
      "CORS configured with allowed origins",
    ],
  },
  {
    id: "email",
    icon: Mail,
    label: "Email",
    name: "@workspace/email",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    features: [
      "React Email templates with Tailwind styling",
      "AWS SES delivery",
      "3 templates: email verification (OTP), password reset, account deleted",
      "Shared footer with security note, support link, legal links",
      "renderEmail / renderText utilities for HTML and plain text",
    ],
  },
  {
    id: "ui",
    icon: Palette,
    label: "UI",
    name: "@workspace/ui",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    features: [
      "25+ components based on shadcn/ui (new-york style) + Radix",
      "Custom: data table, confirm dialog, page loading, animated tabs",
      "Icon sets: general, device, logo",
      "Theme system: CSS vars, oklch colors, light/dark, system preference",
      "Providers: NuqsAdapter, next-themes, Sonner toasts",
      "Utilities: cn, generateId, formatPrice, formatBytes",
      "Hooks: use-mobile, use-upload",
    ],
  },
  {
    id: "config",
    icon: Settings,
    label: "Configs",
    name: "ESLint + TypeScript + Prettier",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    features: [
      "ESLint: base, Next.js (core-web-vitals), React internal",
      "TypeScript: base, Next.js, React library configs",
      "Prettier: import sorting, Tailwind class sorting",
      "All pre-configured — zero setup needed",
    ],
  },
];

export function PackagesSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Batteries Included
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Every Package You Need, Already Wired Together
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Shared packages provide auth, database, API, email, UI, and configs
            — consumed by every app in the monorepo.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="auth" className="mt-16">
          <TabsList className="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-1 bg-transparent">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <TabsTrigger
                  key={pkg.id}
                  value={pkg.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 rounded-full"
                >
                  <Icon className="size-3.5" />
                  {pkg.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {packages.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <TabsContent key={pkg.id} value={pkg.id} className="mt-8">
                <Card className="mx-auto max-w-3xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${pkg.bg}`}
                      >
                        <Icon className={`size-5 ${pkg.color}`} />
                      </div>
                      <div>
                        <CardTitle>{pkg.label}</CardTitle>
                        <p className="text-muted-foreground font-mono text-sm">
                          {pkg.name}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {pkg.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="text-primary mt-0.5 size-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}

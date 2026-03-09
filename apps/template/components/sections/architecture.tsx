// app/(marketing)/_sections/architecture.tsx
import {
  ArrowDown,
  BookOpen,
  CreditCard,
  Database,
  Globe,
  HardDrive,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const appNodes = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    color: "border-blue-500/50 bg-blue-500/5",
    iconColor: "text-blue-500",
  },
  {
    icon: ShieldCheck,
    label: "Admin",
    color: "border-rose-500/50 bg-rose-500/5",
    iconColor: "text-rose-500",
  },
  {
    icon: Globe,
    label: "Website",
    color: "border-emerald-500/50 bg-emerald-500/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: BookOpen,
    label: "Docs",
    color: "border-amber-500/50 bg-amber-500/5",
    iconColor: "text-amber-500",
  },
  {
    icon: Smartphone,
    label: "Mobile",
    color: "border-violet-500/50 bg-violet-500/5",
    iconColor: "text-violet-500",
  },
];

const infraNodes = [
  {
    icon: Database,
    label: "Neon PostgreSQL",
    color: "border-emerald-500/50 bg-emerald-500/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: CreditCard,
    label: "Polar Payments",
    color: "border-blue-500/50 bg-blue-500/5",
    iconColor: "text-blue-500",
  },
  {
    icon: HardDrive,
    label: "Cloudflare R2",
    color: "border-amber-500/50 bg-amber-500/5",
    iconColor: "text-amber-500",
  },
  {
    icon: Mail,
    label: "AWS SES",
    color: "border-rose-500/50 bg-rose-500/5",
    iconColor: "text-rose-500",
  },
];

const keyPoints = [
  "Admin panel connects to Dashboard API — no duplicate backend",
  "Mobile app uses the same tRPC API with bearer auth",
  "Auth handles Polar customer creation automatically",
  "Webhook events stored in DB for auditability",
  "All apps share the same UI components and type definitions",
];

export function ArchitectureSection() {
  return (
    <section className="bg-muted/30 border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Architecture
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One Codebase. Every Layer Connected.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Apps consume shared packages. Packages connect to infrastructure.
            Everything is typed end-to-end.
          </p>
        </div>

        {/* Visual architecture diagram */}
        <div className="mx-auto mt-16 max-w-4xl space-y-6">
          {/* Apps row */}
          <div>
            <p className="text-muted-foreground mb-3 text-center text-xs font-semibold tracking-widest uppercase">
              Apps
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {appNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.label}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${node.color}`}
                  >
                    <Icon className={`size-4 ${node.iconColor}`} />
                    <span className="text-sm font-medium">{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowDown className="text-muted-foreground size-5" />
          </div>

          {/* Shared packages band */}
          <div className="border-primary/20 bg-primary/5 rounded-2xl border-2 border-dashed px-6 py-6 text-center">
            <p className="text-primary mb-2 text-xs font-semibold tracking-widest uppercase">
              Shared Packages
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "@workspace/auth",
                "@workspace/drizzle",
                "@workspace/trpc",
                "@workspace/email",
                "@workspace/ui",
              ].map((pkg) => (
                <Badge
                  key={pkg}
                  variant="secondary"
                  className="rounded-full font-mono text-xs"
                >
                  {pkg}
                </Badge>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowDown className="text-muted-foreground size-5" />
          </div>

          {/* Infrastructure row */}
          <div>
            <p className="text-muted-foreground mb-3 text-center text-xs font-semibold tracking-widest uppercase">
              Infrastructure
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {infraNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.label}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${node.color}`}
                  >
                    <Icon className={`size-4 ${node.iconColor}`} />
                    <span className="text-sm font-medium">{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Key points */}
        <div className="mx-auto mt-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {keyPoints.map((point) => (
                  <li
                    key={point}
                    className="text-muted-foreground flex items-start gap-2 text-sm"
                  >
                    <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// app/(marketing)/_sections/developer-experience.tsx
import {
  ArrowLeftRight,
  Database,
  Gauge,
  GitMerge,
  Mail,
  Paintbrush,
  Settings,
  Shield,
  Terminal,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const features = [
  {
    icon: Terminal,
    title: "One command to run everything",
    description:
      "pnpm dev starts all 5 apps via Turborepo with parallel execution and caching.",
  },
  {
    icon: Shield,
    title: "Type safety everywhere",
    description:
      "tRPC connects frontend to backend with zero codegen. Shared TypeScript configs across all packages.",
  },
  {
    icon: Database,
    title: "Database management",
    description:
      "db:generate, db:migrate, db:push, db:studio — all available from the monorepo root.",
  },
  {
    icon: Mail,
    title: "Email preview",
    description:
      "pnpm turbo:email:dev opens a React Email preview so you see exactly what users receive.",
  },
  {
    icon: GitMerge,
    title: "Dependency sync",
    description:
      "Syncpack keeps dependency versions aligned across every package in the monorepo.",
  },
  {
    icon: Paintbrush,
    title: "Import sorting & formatting",
    description:
      "Prettier with automatic import ordering and Tailwind class sorting — zero config.",
  },
  {
    icon: Settings,
    title: "Environment validation",
    description:
      "A setup page checks all required env vars at dev time so you never ship a misconfigured build.",
  },
  {
    icon: Gauge,
    title: "Rate limiting built in",
    description:
      "LRU-based rate limiter ready to go on any tRPC route. Configurable per-procedure.",
  },
  {
    icon: ArrowLeftRight,
    title: "Cross-app API calls",
    description:
      "createHttpCaller lets server components in admin call dashboard API with forwarded cookies.",
  },
];

export function DeveloperExperience() {
  return (
    <section className="bg-muted/30 border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Developer Experience
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Developer Experience That Doesn&apos;t Get in Your Way
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Every workflow is streamlined so you can focus on building features,
            not fighting tooling.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="hover:border-primary/30 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                      <Icon className="text-primary size-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

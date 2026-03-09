// app/(marketing)/_sections/checklist.tsx
import { Check } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

const items = [
  "5 apps: Dashboard, Admin, Website, Docs, Mobile",
  "7 shared packages: Auth, DB, tRPC, Email, UI, ESLint, TypeScript",
  "8 database tables with full payment data model",
  "30+ tRPC procedures across 6 routers",
  "25+ UI components (shadcn/ui + custom)",
  "3 email templates (verification, reset, deletion)",
  "Google OAuth + email/password auth",
  "Polar payments with checkout, subscriptions, portal",
  "File upload with R2/S3 presigned URLs",
  "Admin panel with user management",
  "Mobile app with secure auth and subscriptions",
  "Full-text search documentation",
  "SEO: sitemap, robots, OG images, metadata",
  "Rate limiting, encryption, CORS",
  "One-command dev, build, and deploy",
];

export function ChecklistSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Everything Included
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Launch
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Not just a starter — a complete product foundation.
          </p>
        </div>

        {/* Checklist */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item}
                className="bg-card hover:border-primary/30 flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                <div className="bg-primary flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="text-primary-foreground size-3" />
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

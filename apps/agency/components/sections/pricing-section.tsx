"use client";

import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { GridCell } from "@/components/grid-cell";
import { SectionLabel } from "@/components/section-label";

const PLANS = [
  {
    name: "Starter",
    price: 300,
    description: "A fully managed web presence for small businesses.",
    features: [
      "3-page website (landing page + 2 additional pages)",
      "Website hosting provisioning and uptime management",
      "Domain registration, DNS configuration, and renewal",
      "Business email account setup and administration",
      "Ongoing website updates and maintenance",
      "Priority technical support via agency@alisamadii.com",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: 650,
    description: "The full stack — auth, admin, and email infrastructure.",
    features: [
      "Everything in Starter",
      "User authentication system (sign up, login, password reset)",
      "Admin panel for basic content management",
      "AWS SES domain integration for transactional email delivery",
      "Dedicated virtual payment card for service billing",
      "Monthly performance and uptime report",
    ],
    highlighted: true,
  },
];

export const PricingSection = () => {
  return (
    <section id="pricing">
      <GridCell>
        <SectionLabel text="Pricing" number="05" />
        <h2 className="font-heading mb-4 text-4xl font-bold md:text-5xl">
          Simple, Transparent Pricing
        </h2>
        <p className="text-muted-foreground max-w-lg">
          Fully managed plans — no hidden fees, no surprises. Cancel any time.
        </p>
      </GridCell>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {PLANS.map((plan, i) => (
          <GridCell key={plan.name} delay={i * 0.1} noHover={plan.highlighted}>
            {plan.highlighted && (
              <div className="from-primary/20 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent" />
            )}
            <div className="relative flex h-full flex-col gap-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.highlighted && (
                      <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 font-mono text-xs">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {plan.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-4xl font-black tracking-tighter tabular-nums">
                    ${plan.price}
                  </p>
                  <p className="text-muted-foreground text-xs">/month</p>
                </div>
              </div>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-muted-foreground flex items-start gap-2.5 text-sm"
                  >
                    <span className={cn("text-primary mt-px shrink-0")}>–</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Button
                  asChild
                  size="lg"
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  <Link href="/portal">Get started</Link>
                </Button>
              </div>
            </div>
          </GridCell>
        ))}
      </div>
    </section>
  );
};

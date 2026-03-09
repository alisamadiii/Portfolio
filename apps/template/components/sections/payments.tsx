// app/(marketing)/_sections/payments.tsx
import {
  Clock,
  CreditCard,
  ExternalLink,
  Receipt,
  RefreshCw,
  TicketPercent,
  ToggleLeft,
  UserPlus,
  Webhook,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const paymentFeatures = [
  {
    icon: CreditCard,
    title: "Checkout & Subscriptions",
    description:
      "Polar handles checkout, plan selection, and recurring billing.",
  },
  {
    icon: Clock,
    title: "Trial Period Support",
    description: "Configurable trial intervals and counts per product.",
  },
  {
    icon: RefreshCw,
    title: "Plan Switching",
    description: "Upgrade, downgrade, or cancel subscriptions with proration.",
  },
  {
    icon: Receipt,
    title: "Order Tracking",
    description:
      "Discount amounts, invoice numbers, and billing reasons on every order.",
  },
  {
    icon: ExternalLink,
    title: "Customer Portal",
    description:
      "Generate portal links so customers manage billing themselves.",
  },
  {
    icon: Webhook,
    title: "Webhook Audit Trail",
    description: "Every webhook event is stored in your database for review.",
  },
  {
    icon: ToggleLeft,
    title: "Monthly/Yearly Toggle",
    description:
      "Pricing component with interval toggle — drop it on any page.",
  },
  {
    icon: TicketPercent,
    title: "Discount Codes",
    description: "Verify and apply Polar discount codes at checkout.",
  },
  {
    icon: UserPlus,
    title: "Auto Customer Creation",
    description:
      "Polar customer created automatically on signup — zero manual setup.",
  },
];

export function PaymentsSection() {
  return (
    <section className="bg-muted/30 border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Payments
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Monetize from Day One
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Polar integration gives you checkout, subscriptions, billing portal,
            discount codes, and webhooks — out of the box.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paymentFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="hover:border-primary/30 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Icon className="size-4 text-emerald-500" />
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

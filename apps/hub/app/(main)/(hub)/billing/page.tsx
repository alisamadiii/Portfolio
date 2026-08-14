"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import { PolarBilling } from "@/components/billing/polar-billing";
import { StripeBilling } from "@/components/billing/stripe-billing";
import { DocumentTitle } from "@/components/document-title";

const tabs = [
  { label: "Plan", value: "plan" },
  { label: "Purchases", value: "purchases" },
] as const;

export default function BillingPage() {
  return (
    <Suspense>
      <BillingTabs />
    </Suspense>
  );
}

const BillingTabs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "purchases" ? "purchases" : "plan";

  const setTab = (value: string) => {
    router.replace(
      value === "purchases" ? `${pathname}?tab=purchases` : pathname,
      { scroll: false }
    );
  };

  return (
    <div className="space-y-6">
      <DocumentTitle title="Billing" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[27px] font-extrabold tracking-tight">Billing</h2>
        <div className="flex gap-2.5">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4.5 py-2 text-[13.5px] font-semibold transition-colors",
                tab === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-secondary-foreground border-border hover:bg-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "plan" ? <StripeBilling /> : <PolarBilling />}
    </div>
  );
};

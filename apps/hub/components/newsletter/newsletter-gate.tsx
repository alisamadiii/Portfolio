"use client";

import { ProjectFeatureGate } from "@/components/settings/project-paywall";

/** Newsletter pages are full-bleed: the paywall scrolls in its own column when locked. */
export function NewsletterGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <ProjectFeatureGate feature="newsletter">{children}</ProjectFeatureGate>
    </div>
  );
}

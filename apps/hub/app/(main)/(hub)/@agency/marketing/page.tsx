"use client";

import { AdsAlerts } from "@/components/agency/ads-alerts";
import { AdsPerformance } from "@/components/agency/ads-performance";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Marketing" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Marketing</h2>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          What your Google Ads cost, and what they brought in.
        </p>
      </div>
      <AdsAlerts />
      <AdsPerformance />
    </div>
  );
}

"use client";

import { TrackerSoon } from "@/components/agency/tracker-soon";
import { useAgencyHref } from "@/components/agency/use-agency";

export default function CallsTrackerPage() {
  const href = useAgencyHref();
  return (
    <TrackerSoon
      title="Calls"
      description="Phone calls from your ads and website will show here as leads. Calls from your Google Ads are already counted on the Conversions page."
      action={{
        label: "Open Conversions",
        href: href("/marketing/conversions"),
      }}
    />
  );
}

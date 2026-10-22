import { TrackerSoon } from "@/components/agency/tracker-soon";

export default function CallsTrackerPage() {
  return (
    <TrackerSoon
      title="Calls"
      description="Phone calls from your ads and website will show here as leads. Calls from your Google Ads are already counted on the Conversions page."
      action={{ label: "Open Conversions", href: "/marketing/conversions" }}
    />
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { KpiGrid } from "@/components/ds/ui/misc";

import { SectionCard } from "./section-card";

/** Feedback + Google Reviews on Home: the numbers a client asks about first. Tiles for an uninstalled app are left out. */
export function ReviewsSection({
  projectId,
  feedback,
  googleReviews,
}: {
  projectId: string;
  feedback: boolean;
  googleReviews: boolean;
}) {
  const trpc = useTRPC();
  const reviews = useQuery(
    trpc.googleReviews.get.queryOptions({ projectId }, { enabled: googleReviews, retry: false, staleTime: 5 * 60_000 })
  );
  const stats = useQuery(
    trpc.feedback.stats.queryOptions({ projectId }, { enabled: feedback, retry: false, staleTime: 60_000 })
  );
  const source = reviews.data?.source ?? null;
  const f = stats.data;
  const items = [
    ...(googleReviews
      ? [
          { label: "Google rating", value: source?.rating != null ? source.rating.toFixed(1) : "—" },
          { label: "Google reviews", value: source?.totalReviews != null ? String(source.totalReviews) : "—" },
        ]
      : []),
    ...(feedback
      ? [
          { label: "Feedback rating", value: f?.average != null ? f.average.toFixed(1) : "—" },
          { label: "Feedback responses", value: f ? String(f.total) : "—" },
          { label: "Sent to Google", value: f ? String(f.toGoogle) : "—" },
        ]
      : []),
  ];
  const href = googleReviews ? "/google-reviews" : "/feedback";
  return (
    <SectionCard
      title="Reviews"
      icon={<Star className="size-4" strokeWidth={1.8} />}
      href={href}
      linkLabel={googleReviews ? "Open Google Reviews" : "Open Feedback"}
      loading={(googleReviews && reviews.isPending) || (feedback && stats.isPending)}
      className="xl:col-span-2"
    >
      <KpiGrid bare dim={items.every((i) => i.value === "—")} items={items} />
    </SectionCard>
  );
}

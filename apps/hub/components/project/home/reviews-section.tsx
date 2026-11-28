"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { KpiGrid } from "@/components/ds/ui/misc";

import { SectionCard } from "./section-card";

/** Google Reviews on Home: the numbers a client asks about first. */
export function ReviewsSection({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const reviews = useQuery(
    trpc.googleReviews.get.queryOptions({ projectId }, { retry: false, staleTime: 5 * 60_000 })
  );
  const source = reviews.data?.source ?? null;
  const items = [
    { label: "Google rating", value: source?.rating != null ? source.rating.toFixed(1) : "—" },
    { label: "Google reviews", value: source?.totalReviews != null ? String(source.totalReviews) : "—" },
  ];
  return (
    <SectionCard
      title="Reviews"
      icon={<Star className="size-4" strokeWidth={1.8} />}
      href="/google-reviews"
      linkLabel="Open Google Reviews"
      loading={reviews.isPending}
      className="xl:col-span-2"
    >
      <KpiGrid bare dim={items.every((i) => i.value === "—")} items={items} />
    </SectionCard>
  );
}

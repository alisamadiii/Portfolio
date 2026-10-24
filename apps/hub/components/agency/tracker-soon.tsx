import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { FrameCard, PageShell } from "@/components/agency/page-shell";
import { StatusPill } from "@/components/agency/lead-status";
import { DocumentTitle } from "@/components/document-title";
import { Info, Phone } from "@/components/icon";

const FEATURES = [
  "Every call from your ads and website, logged like a form lead",
  "Who called, when, and which campaign or page sent them",
  "Missed calls flagged so no lead slips through",
];

/** A lead tracker that isn't built yet: what it will do, and where to go meanwhile. */
export function TrackerSoon({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <PageShell
      eyebrow="LEAD TRACKERS"
      title={
        <span className="flex items-center gap-3">
          {title}
          <StatusPill tone="accent" dot={false}>
            Coming soon
          </StatusPill>
        </span>
      }
      lead={description}
    >
      <DocumentTitle title={title} />
      <FrameCard innerClassName="flex flex-wrap gap-8 p-8">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <span className="bg-primary/16 flex size-12 items-center justify-center rounded-full">
            <Phone className="text-[#c2451f] size-6" />
          </span>
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
            Every call, tracked like a form lead
          </h2>
          <ul className="flex flex-col gap-2.5 text-[16px]">
            {FEATURES.map((feature) => (
              <li key={feature} className="text-muted-foreground flex gap-2.5">
                <span aria-hidden className="text-primary">
                  •
                </span>
                {feature}
              </li>
            ))}
          </ul>
          {action && (
            <div className="flex items-start gap-2.5 rounded-[12px] bg-[#e4edf1] p-4 text-[15px] text-[#2d5e7a]">
              <Info className="mt-0.5 size-4.5 shrink-0" />
              <span>
                Calls from your Google Ads are already counted on the
                Conversions page.{" "}
                <Link
                  href={action.href}
                  className="font-semibold underline underline-offset-2"
                >
                  {action.label}
                </Link>
              </span>
            </div>
          )}
        </div>
        {/* Skeleton preview of future call rows */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-foreground/7 flex items-center gap-3 rounded-[12px] border p-3.5 opacity-70"
              style={{ opacity: 0.8 - i * 0.22 }}
            >
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </FrameCard>
    </PageShell>
  );
}

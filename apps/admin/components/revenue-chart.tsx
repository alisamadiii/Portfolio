"use client";

import { ChevronDown } from "lucide-react";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

const formatUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });

export const RevenueChart = ({
  data,
  isLoading,
  className,
}: {
  data?: { month: string; revenue: number }[];
  isLoading?: boolean;
  className?: string;
}) => {
  const max = Math.max(...(data?.map((d) => d.revenue) ?? []), 1);

  return (
    <section className={cn("bg-card rounded-2xl border p-5", className)}>
      <header className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold">Revenue</h2>
        <span className="text-muted-foreground flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs">
          Month <ChevronDown className="size-3.5" />
        </span>
      </header>

      {isLoading ? (
        <Skeleton className="h-52 w-full" />
      ) : (
        <div className="flex gap-3">
          <div className="text-num text-muted-foreground flex h-52 flex-col justify-between pb-5 text-right text-[10px]">
            <span>100%</span>
            <span>75%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          <div className="relative h-52 flex-1">
            <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-border border-t border-dashed" />
              ))}
            </div>
            <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-2">
              {data?.map((d) => {
                const isMax = d.revenue === max && d.revenue > 0;
                return (
                  <div
                    key={d.month}
                    title={`${formatUSD(d.revenue)} · ${monthLabel(d.month)}`}
                    className={cn(
                      "min-h-1 flex-1 rounded-t-md transition-[height] duration-150",
                      isMax ? "bg-teal-600" : "bar-hatch"
                    )}
                    style={{ height: `${(d.revenue / max) * 100}%` }}
                  />
                );
              })}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex gap-2">
              {data?.map((d) => (
                <span
                  key={d.month}
                  className="text-num text-muted-foreground flex-1 text-center text-[10px]"
                >
                  {monthLabel(d.month)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

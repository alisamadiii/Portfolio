"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { SpeedMark } from "@/components/analytics/speed-mark";
import { useWebsiteUrl } from "@/hooks/use-website-url";

// ─── PageSpeed Insights (client-side — PSI supports CORS, runs 15–30s, and a
// server route would sit on a Vercel function the whole time) ───────────────

type PsiResult = {
  /** 0–100 Lighthouse performance score. */
  score: number;
  metrics: { label: string; value: string; good: boolean }[];
};

const PSI_AUDITS: [id: string, label: string][] = [
  ["first-contentful-paint", "First Contentful Paint"],
  ["largest-contentful-paint", "Largest Contentful Paint"],
  ["total-blocking-time", "Total Blocking Time"],
  ["cumulative-layout-shift", "Cumulative Layout Shift"],
  ["speed-index", "Speed Index"],
];

async function runPsi(
  url: string,
  strategy: "mobile" | "desktop"
): Promise<PsiResult> {
  // Keyless PSI shares an anonymous pool with ~zero daily quota — a key
  // (25k/day, free) is effectively required. Public by design; restrict it
  // by referrer + PSI-only in the Cloud console.
  const key = process.env.NEXT_PUBLIC_PAGESPEED_API_KEY;
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance${key ? `&key=${key}` : ""}`;
  const res = await fetch(endpoint);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      data?.error?.message ?? `Speed test failed (${res.status})`
    );
  }
  const lighthouse = data?.lighthouseResult;
  const score = Math.round(
    (lighthouse?.categories?.performance?.score ?? 0) * 100
  );
  const metrics = PSI_AUDITS.map(([id, label]) => {
    const audit = lighthouse?.audits?.[id];
    return {
      label,
      value: (audit?.displayValue as string | undefined) ?? "—",
      good: (audit?.score ?? 0) >= 0.9,
    };
  });
  return { score, metrics };
}

// Lighthouse buckets: 90+ good, 50–89 needs improvement, <50 poor.
const scoreColor = (score: number) =>
  score >= 90
    ? "var(--status-success)"
    : score >= 50
      ? "#f59e0b"
      : "var(--destructive)";

/** Lighthouse-style score ring, plain SVG — no chart lib needed for one arc. */
const ScoreGauge = ({ score }: { score: number }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const color = scoreColor(score);
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeOpacity={0.15}
          strokeWidth={8}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-[28px] font-extrabold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
};

/**
 * Speed-test-style progress: a sweeping arc with a counter easing toward 99%
 * (the real work is remote — progress is honest theater) and staged labels.
 */
const TestingGauge = ({ label }: { label: string }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(
      // Asymptotic approach — fast early, crawls near the end, never hits 100
      // before the response lands and swaps this component out.
      () => setProgress((prev) => prev + (99 - prev) * 0.04),
      250
    );
    return () => clearInterval(id);
  }, []);
  const pct = Math.floor(progress);
  const stage =
    pct < 25
      ? "Contacting Google…"
      : pct < 55
        ? "Loading your website…"
        : pct < 85
          ? "Auditing performance…"
          : "Almost done…";
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="bg-card rounded-lg border p-6">
      <p className="text-muted-foreground mb-4 text-[12px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-center gap-6">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.12}
              strokeWidth={8}
            />
            {/* progress arc trails the counter */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.35}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
          </svg>
          {/* sweeping comet on top — the "live test" feel */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full animate-spin [animation-duration:1.6s]"
          >
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.18} ${circumference}`}
            />
          </svg>
          <span className="text-muted-foreground absolute inset-0 grid place-items-center text-[22px] font-extrabold tabular-nums">
            {pct}%
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[13px] font-medium">{stage}</p>
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-4 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
};

const PanelHeading = () => (
  <div>
    <h2 className="text-[22px] font-extrabold tracking-tight">Speed</h2>
    <p className="text-muted-foreground mt-1 text-[14px]">
      Google Lighthouse performance test of your live website — scores and
      Core Web Vitals for mobile and desktop.
    </p>
  </div>
);

export function SpeedPanel() {
  // On-demand — two Lighthouse runs take ~30s, so never auto-fire; the
  // result sticks for the session.
  const { websiteUrl, status: domainStatus } = useWebsiteUrl();
  const psi = useQuery({
    queryKey: ["psi", websiteUrl],
    enabled: false,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const [mobile, desktop] = await Promise.all([
        runPsi(websiteUrl!, "mobile"),
        runPsi(websiteUrl!, "desktop"),
      ]);
      return { mobile, desktop };
    },
  });

  if (domainStatus === "missing") {
    return (
      <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
        <PanelHeading />
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <div className="bg-status-neutral-bg border-status-neutral/50 text-status-neutral mx-auto grid size-14 place-items-center rounded-2xl border">
            <SpeedMark className="size-6" />
          </div>
          <h3 className="mt-5 text-[20px] font-extrabold tracking-tight">
            No domain connected
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
            Connect a domain in the Domain tab and the speed test will run
            against your live website.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PanelHeading />
        <div className="flex items-center gap-3">
          {psi.data && websiteUrl && (
            <a
              href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(websiteUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground text-[13px] underline underline-offset-2"
            >
              Open full report
            </a>
          )}
          <Button
            type="button"
            disabled={psi.isFetching || !websiteUrl}
            onClick={() => psi.refetch()}
          >
            {psi.isFetching
              ? "Testing… ~30s"
              : psi.data
                ? "Retest"
                : "Run speed test"}
          </Button>
        </div>
      </div>

      {psi.isFetching ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <TestingGauge label="Mobile" />
          <TestingGauge label="Desktop" />
        </div>
      ) : psi.isError ? (
        <div className="bg-card rounded-lg border p-6">
          <p className="text-destructive text-[14px]">
            {psi.error instanceof Error
              ? psi.error.message
              : "Speed test failed."}
          </p>
        </div>
      ) : psi.data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {(
            [
              ["Mobile", psi.data.mobile],
              ["Desktop", psi.data.desktop],
            ] as const
          ).map(([label, result]) => (
            <div key={label} className="bg-card rounded-lg border p-6">
              <p className="text-muted-foreground mb-4 text-[12px] font-medium uppercase tracking-wide">
                {label}
              </p>
              <div className="flex items-center gap-6">
                <ScoreGauge score={result.score} />
                <ul className="min-w-0 flex-1 space-y-2">
                  {result.metrics.map((metric) => (
                    <li
                      key={metric.label}
                      className="flex items-center justify-between gap-3 text-[13px]"
                    >
                      <span className="text-muted-foreground truncate">
                        {metric.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium tabular-nums",
                          metric.good
                            ? "text-status-success"
                            : "text-destructive"
                        )}
                      >
                        {metric.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <div className="bg-status-neutral-bg border-status-neutral/50 text-status-neutral mx-auto grid size-14 place-items-center rounded-2xl border">
            <SpeedMark className="size-6" />
          </div>
          <h3 className="mt-5 text-[20px] font-extrabold tracking-tight">
            Test your website&apos;s speed
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
            Run a Google Lighthouse test against{" "}
            <span className="text-foreground font-medium">
              {websiteUrl?.replace(/^https?:\/\//, "")}
            </span>{" "}
            to see performance scores for mobile and desktop. Takes about 30
            seconds.
          </p>
          <Button
            type="button"
            className="mt-6"
            disabled={!websiteUrl}
            onClick={() => psi.refetch()}
          >
            Run speed test
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MonitorSmartphone, Search, Star } from "lucide-react";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import {
  INDUSTRIES,
  industryOf,
  type ClientWebsite,
  type Industry,
} from "@workspace/trpc/lib/client-websites-shared";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { PageHeader } from "@/components/ds/layout/page-header";
import { isAdminUser } from "@/lib/authz-shared";
import { formatDate, siteUrl } from "@/lib/client-websites";

import { LocationDialog } from "./location-dialog";

// 6 per page so the grid never mounts more than 6 live site previews at once.
const PER_PAGE = 6;

/**
 * Admin only: every design in the client-websites R2 bucket. Filter state
 * lives in the URL (?q, ?industry, ?page) so back and reload keep the view.
 */
export function WebsitesPage() {
  const user = useCurrentUser();
  const isAdmin = isAdminUser(user.data?.user);
  const trpc = useTRPC();
  const websites = useQuery(trpc.clientWebsites.list.queryOptions(undefined, { enabled: isAdmin }));
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (!user.isPending && !isAdmin) {
    return (
      <Card>
        <EmptyState
          icon={<MonitorSmartphone className="size-5" />}
          title="Admins only"
          text="Client websites are only visible to the agency team."
        />
      </Card>
    );
  }

  const data = websites.data;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const needle = q.toLowerCase();
  const rows = (data ?? []).map((website) => ({
    website,
    industry: industryOf(website.meta?.showcase?.industry, website.meta?.business?.category),
  }));
  // tabs: only industries that have at least one website, with counts
  const tabs = INDUSTRIES.map((i) => ({
    id: i.id,
    label: i.label,
    count: rows.filter((r) => r.industry === i.id).length,
  })).filter((t) => t.count > 0);
  const industry = tabs.find((t) => t.id === params.get("industry"))?.id ?? null;

  const matches = rows
    .filter(
      ({ website, industry: own }) =>
        (!industry || own === industry) &&
        (!needle ||
          [website.meta?.name, website.slug, website.meta?.business?.category, website.meta?.business?.address]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle))
    )
    .map((r) => r.website);
  const pageCount = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const shown = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const update = (next: { q?: string; industry?: Industry | null; page?: number }) => {
    const out = new URLSearchParams();
    const nextQ = (next.q ?? q).trim();
    const nextIndustry = next.industry === undefined ? industry : next.industry;
    // a new search or tab starts from page 1
    const nextPage = next.page ?? 1;
    if (nextQ) out.set("q", nextQ);
    if (nextIndustry) out.set("industry", nextIndustry);
    if (nextPage > 1) out.set("page", String(nextPage));
    const url = out.size ? `${pathname}?${out}` : pathname;
    if (next.q !== undefined) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Client websites"
        count={data?.length}
        description="Designs in the client-websites bucket. Open one to walk a client through it, take payment or import it into Sites."
      />

      {data && data.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="max-w-full overflow-x-auto">
              <SegmentedTabs
                label="Filter by industry"
                value={industry ?? "all"}
                onChange={(id) => update({ industry: id === "all" ? null : (id as Industry) })}
                items={[{ id: "all", label: "All", count: rows.length }, ...tabs]}
              />
            </div>
            <div className="flex-1" />
            <label className="flex h-9 w-[260px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
              <Search className="size-4" aria-hidden />
              <input
                type="search"
                aria-label="Search client websites"
                placeholder="Search by name, category or city"
                value={params.get("q") ?? ""}
                onChange={(e) => update({ q: e.target.value })}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
              />
            </label>
          </div>
        </Card>
      )}

      {websites.isError && (
        <Card>
          <EmptyState
            icon={<MonitorSmartphone className="size-5" />}
            title="Couldn't load the websites"
            text={websites.error.message}
          />
        </Card>
      )}
      {data?.length === 0 && (
        <Card>
          <EmptyState
            icon={<MonitorSmartphone className="size-5" />}
            title="No websites yet"
            text="Upload a design folder to the client-websites bucket and it shows up here."
          />
        </Card>
      )}
      {data && data.length > 0 && matches.length === 0 && (
        <p className="text-[13px] text-dim">
          No websites match{q ? ` "${q}"` : ""}
          {industry ? ` in ${tabs.find((t) => t.id === industry)?.label}` : ""}.
        </p>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {websites.isPending &&
          isAdmin &&
          Array.from({ length: PER_PAGE }, (_, i) => (
            <div key={i} className="h-[300px] animate-pulse rounded-card border border-line bg-surface" />
          ))}
        {shown.map((website) => (
          <WebsiteCard key={website.slug} website={website} />
        ))}
      </div>

      {pageCount > 1 && (
        <nav aria-label="Website pages" className="flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => update({ page: page - 1 })}
            icon={<ChevronLeft className="size-4" />}
          >
            Previous
          </Button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              size="sm"
              variant={n === page ? "dark" : "outline"}
              aria-current={n === page ? "page" : undefined}
              onClick={() => update({ page: n })}
              className="w-8 px-0"
            >
              {n}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={page === pageCount}
            onClick={() => update({ page: page + 1 })}
            trailingIcon={<ChevronRight className="size-4" />}
          >
            Next
          </Button>
        </nav>
      )}
    </>
  );
}

function WebsiteCard({ website }: { website: ClientWebsite }) {
  const { slug, meta, metaStatus, updatedAt } = website;
  const business = meta?.business;
  const date = formatDate(updatedAt);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface hover:border-line-hover">
      <Thumbnail slug={slug} />
      <div className="flex flex-1 flex-col gap-2 border-t border-line p-[18px]">
        <h2 className="text-base font-semibold leading-snug">
          {/* Stretched over the card; the address button sits above it. */}
          <Link
            href={`/client-websites/${encodeURIComponent(slug)}`}
            className="outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-coral"
          >
            {meta?.name ?? slug}
          </Link>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {business?.category && <Badge tone="coral">{business.category}</Badge>}
          {metaStatus !== "ok" && (
            <Badge tone="warning">{metaStatus === "missing" ? "No _meta.json" : "Invalid _meta.json"}</Badge>
          )}
          {business?.rating != null && (
            <span className="flex items-center gap-1 text-[13px] text-ink">
              <Star className="size-3.5 fill-coral text-coral" aria-hidden />
              {business.rating.toFixed(1)}
              {business.reviewCount != null && <span className="text-dim">({business.reviewCount})</span>}
            </span>
          )}
        </div>
        <div className="mt-auto flex flex-col gap-1 pt-1 text-[13px] text-dim">
          {business?.address && <LocationDialog name={meta?.name ?? slug} address={business.address} />}
          {date && <p>Uploaded {date}</p>}
        </div>
      </div>
    </div>
  );
}

// The live homepage at a 1280x800 desktop viewport, scaled to the card's
// width. Display only: clicks fall through to the card's link.
function Thumbnail({ slug }: { slug: string }) {
  const [scale, setScale] = useState(0.25);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / 1280);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} className="relative aspect-[16/10] w-full overflow-hidden bg-subtle">
      <iframe
        src={siteUrl(slug)}
        title=""
        aria-hidden
        tabIndex={-1}
        loading="lazy"
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 h-[800px] w-[1280px] origin-top-left border-0"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}

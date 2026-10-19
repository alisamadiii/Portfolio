"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";

type Stop = RouterOutputs["leads"]["workspace"]["list"][number];
type Coord = { lat: number; lng: number };

const STATUSES = [
  "new",
  "contacted",
  "interested",
  "meeting",
  "won",
  "lost",
] as const;

// Fallback origin when geolocation is denied — same base the near-me scans
// use (Jacksonville, FL).
const HOME: Coord = { lat: 30.3048973, lng: -81.5660117 };

// Great-circle miles. Same math as the server's places.ts helper, inlined
// because that module is server-only and can't be imported into the client.
const distanceMiles = (a: Coord, b: Coord): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

type RouteStep = { stop: Stop; leg: number | null };

// Greedy nearest-neighbor from the origin: repeatedly drive to the closest
// stop not yet visited, then continue from there — never passing one you
// haven't handled. Stops without coords sort to the end (legless).
const orderRoute = (origin: Coord, stops: Stop[]): RouteStep[] => {
  const remaining = stops.filter((s) => s.lat != null && s.lng != null);
  const noCoords = stops.filter((s) => s.lat == null || s.lng == null);
  const ordered: RouteStep[] = [];
  let cur = origin;
  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = distanceMiles(cur, { lat: s.lat!, lng: s.lng! });
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    });
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push({ stop: next!, leg: bestD });
    cur = { lat: next!.lat!, lng: next!.lng! };
  }
  for (const s of noCoords) ordered.push({ stop: s, leg: null });
  return ordered;
};

const directionsUrl = (stop: Stop): string => {
  if (stop.lat != null && stop.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
  }
  if (stop.mapsUrl) return stop.mapsUrl;
  const q = encodeURIComponent(`${stop.name} ${stop.address ?? ""}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

const websiteLabel = (stop: Stop): { text: string; className: string } => {
  if (!stop.website)
    return { text: "No website", className: "bg-rose-100 text-rose-600" };
  if (stop.socialOnly)
    return { text: "Social only", className: "bg-amber-100 text-amber-700" };
  if (stop.websiteDead)
    return { text: "Site down", className: "bg-orange-100 text-orange-700" };
  return { text: "Has website", className: "bg-muted text-muted-foreground" };
};

export const WorkspaceView = () => {
  const trpc = useTRPC();

  const [origin, setOrigin] = useState<Coord>(HOME);
  const [usingLive, setUsingLive] = useState(false);
  const [locating, setLocating] = useState(false);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation isn't available — using home base");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingLive(true);
        setLocating(false);
      },
      () => {
        setUsingLive(false);
        setLocating(false);
        toast.error("Couldn't get your location — using home base");
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const list = useQuery(trpc.leads.workspace.list.queryOptions());
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.leads.workspace.list.queryKey(),
    });

  const markVisited = useMutation(
    trpc.leads.workspace.markVisited.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    })
  );
  const setOutcome = useMutation(
    trpc.leads.workspace.setOutcome.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Note saved");
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const clearVisited = useMutation(
    trpc.leads.workspace.clearVisited.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Cleared visited stops");
      },
      onError: (error) => toast.error(error.message),
    })
  );
  // Pipeline status lives on the lead itself — reuse the shared mutation so
  // the scan list and dashboard cards stay in sync.
  const updateStatus = useMutation(
    trpc.leads.updateStatus.mutationOptions({
      onSuccess: () => {
        invalidate();
        queryClient.invalidateQueries({
          queryKey: trpc.leads.list.queryKey(),
        });
        queryClient.invalidateQueries({ queryKey: trpc.leads.won.queryKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const stops = list.data ?? [];
  const pending = stops.filter((s) => s.visitStatus === "pending");
  const visited = stops.filter((s) => s.visitStatus === "visited");
  const route = useMemo(() => orderRoute(origin, pending), [origin, pending]);

  let cumulative = 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm [&_svg]:size-4"
      >
        <ArrowLeft /> Back to scans
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Today&apos;s visits</h1>
          <p className="text-muted-foreground text-sm">
            {pending.length} to visit · routed from{" "}
            {usingLive ? "your current location" : "home base"}
          </p>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
        >
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          Refresh my location
        </button>
      </div>

      {list.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : stops.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed px-6 py-16 text-center text-sm">
          No stops yet. Open a scan and hit the{" "}
          <MapPin className="inline size-4 align-text-bottom" /> button on a lead
          to add it here.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Up next
              </h2>
              {route.map(({ stop, leg }, i) => {
                if (leg != null) cumulative += leg;
                return (
                  <StopCard
                    key={stop.id}
                    stop={stop}
                    seq={i + 1}
                    leg={leg}
                    cumulative={leg != null ? cumulative : null}
                    busy={markVisited.isPending}
                    onVisited={() =>
                      markVisited.mutate({ id: stop.id, visited: true })
                    }
                    onSaveOutcome={(outcome) =>
                      setOutcome.mutate({ id: stop.id, outcome })
                    }
                    onStatusChange={(status) =>
                      updateStatus.mutate({ id: stop.leadId, status })
                    }
                  />
                );
              })}
            </section>
          )}

          {visited.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Done today ({visited.length})
                </h2>
                <button
                  type="button"
                  onClick={() => clearVisited.mutate()}
                  disabled={clearVisited.isPending}
                  className="btn-pill btn-light h-8 px-3 text-xs [&_svg]:size-3.5"
                >
                  <Trash2 /> Clear done
                </button>
              </div>
              {visited.map((stop) => (
                <DoneCard
                  key={stop.id}
                  stop={stop}
                  busy={markVisited.isPending}
                  onUndo={() =>
                    markVisited.mutate({ id: stop.id, visited: false })
                  }
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const StopCard = ({
  stop,
  seq,
  leg,
  cumulative,
  busy,
  onVisited,
  onSaveOutcome,
  onStatusChange,
}: {
  stop: Stop;
  seq: number;
  leg: number | null;
  cumulative: number | null;
  busy: boolean;
  onVisited: () => void;
  onSaveOutcome: (outcome: string) => void;
  onStatusChange: (status: (typeof STATUSES)[number]) => void;
}) => {
  const [outcome, setOutcomeText] = useState(stop.outcome ?? "");
  const website = websiteLabel(stop);

  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <div className="flex gap-3">
        <span className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {seq}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold break-words">{stop.name}</h3>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                website.className
              )}
            >
              {website.text}
            </span>
          </div>
          {stop.address && (
            <p className="text-muted-foreground mt-0.5 text-sm break-words">
              {stop.address}
            </p>
          )}
          <p className="text-muted-foreground mt-0.5 text-xs">
            {leg != null
              ? `${leg.toFixed(1)} mi from last · ${cumulative!.toFixed(1)} mi total`
              : "No coordinates — location unknown"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={directionsUrl(stop)}
              target="_blank"
              rel="noreferrer"
              className="btn-pill btn-dark h-9 px-4 text-sm [&_svg]:size-4"
            >
              <Navigation /> Directions
            </a>
            {stop.phone && (
              <a
                href={`tel:${stop.phone}`}
                className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
              >
                <Phone /> Call
              </a>
            )}
            {stop.website && (
              <a
                href={stop.website}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
              >
                Website
              </a>
            )}
            <button
              type="button"
              onClick={onVisited}
              disabled={busy}
              className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
            >
              <Check /> Mark visited
            </button>
            <Select
              value={stop.status}
              onValueChange={(value) => {
                if (value) onStatusChange(value as (typeof STATUSES)[number]);
              }}
            >
              <SelectTrigger size="sm" className="w-32 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={outcome}
            onChange={(e) => setOutcomeText(e.target.value)}
            onBlur={() => {
              if ((stop.outcome ?? "") !== outcome) onSaveOutcome(outcome);
            }}
            placeholder="What happened with this client?"
            className="mt-3 min-h-16"
          />
        </div>
      </div>
    </div>
  );
};

const DoneCard = ({
  stop,
  busy,
  onUndo,
}: {
  stop: Stop;
  busy: boolean;
  onUndo: () => void;
}) => (
  <div className="bg-muted/40 border-border rounded-2xl border p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-medium break-words line-through decoration-1">
          {stop.name}
        </h3>
        {stop.outcome && (
          <p className="text-muted-foreground mt-1 text-sm break-words whitespace-pre-wrap">
            {stop.outcome}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onUndo}
        disabled={busy}
        className="btn-pill btn-light h-8 shrink-0 px-3 text-xs [&_svg]:size-3.5"
      >
        <RotateCcw /> Undo
      </button>
    </div>
  </div>
);

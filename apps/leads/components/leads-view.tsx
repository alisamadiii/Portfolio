"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Phone,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";

import { queryClient, useTRPC } from "@workspace/trpc/client";

type Lead = RouterOutputs["leads"]["list"][number];

const STATUSES = ["new", "contacted", "interested", "won", "lost"] as const;

function websiteBadge(lead: Lead) {
  if (!lead.website) return <Badge variant="destructive">No website</Badge>;
  if (lead.socialOnly) return <Badge variant="secondary">Social only</Badge>;
  if (lead.websiteDead) return <Badge variant="secondary">Site down</Badge>;
  return <Badge variant="outline">Has site</Badge>;
}

// Own outreach script — filled from lead data.
function callScript(lead: Lead, niche: string, city: string) {
  const reason = !lead.website
    ? "you come up on Google Maps, but there's no website linked to the listing"
    : lead.socialOnly
      ? "your listing only links to a social page, not a real website"
      : "the website linked on your listing doesn't seem to load";

  return `Hi, is this ${lead.name}?

My name is Ali — I build websites for ${niche} businesses around ${city}. Quick reason for the call: I was looking up ${niche} companies in ${city} and ${reason}.

That matters because most people check a business online before they call — and right now they find nothing, so many just call the next company on the list.

I already put together a quick mockup of what a site for ${lead.name} could look like. It costs nothing to take a look — would tomorrow morning or afternoon work better for a five-minute walkthrough?`;
}

function exportCsv(leads: Lead[], filename: string) {
  const header = [
    "Name",
    "Phone",
    "Address",
    "Website",
    "Rating",
    "Reviews",
    "Score",
    "Status",
    "Maps URL",
  ];
  const escape = (v: string | number | null) =>
    `"${String(v ?? "").replaceAll('"', '""')}"`;
  const rows = leads.map((l) =>
    [
      l.name,
      l.phone,
      l.address,
      l.website ?? "none",
      l.rating,
      l.reviewCount,
      l.score,
      l.status,
      l.mapsUrl,
    ]
      .map(escape)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const LeadsView = ({ scanId }: { scanId: number }) => {
  const trpc = useTRPC();

  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [openLeadId, setOpenLeadId] = useState<number | null>(null);

  const scan = useQuery(trpc.leads.scan.get.queryOptions({ scanId }));
  const leads = useQuery(
    trpc.leads.list.queryOptions({
      scanId,
      noWebsiteOnly,
      status:
        status === "all" ? undefined : (status as (typeof STATUSES)[number]),
    })
  );

  const invalidateLeads = () =>
    queryClient.invalidateQueries({ queryKey: trpc.leads.list.queryKey() });

  const updateStatus = useMutation(
    trpc.leads.updateStatus.mutationOptions({ onSuccess: invalidateLeads })
  );
  const updateNotes = useMutation(
    trpc.leads.updateNotes.mutationOptions({
      onSuccess: () => {
        invalidateLeads();
        toast.success("Notes saved");
      },
    })
  );

  const rows = leads.data ?? [];
  const openLead = rows.find((l) => l.id === openLeadId) ?? null;

  const statusSelect = (lead: Lead, size: "sm" | "default" = "sm") => (
    <Select
      value={lead.status}
      onValueChange={(value) => {
        if (!value) return;
        updateStatus.mutate({
          id: lead.id,
          status: value as (typeof STATUSES)[number],
        });
      }}
    >
      <SelectTrigger
        size={size === "sm" ? "sm" : "default"}
        className="w-32 capitalize"
        onClick={(e) => e.stopPropagation()}
      >
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
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft /> Scans
            </Link>
          </Button>
          {scan.data && (
            <h1 className="text-lg font-semibold capitalize">
              {scan.data.query} — {scan.data.city}, {scan.data.state}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="no-website"
              checked={noWebsiteOnly}
              onCheckedChange={setNoWebsiteOnly}
            />
            <Label htmlFor="no-website" className="text-sm">
              Leads only
            </Label>
          </div>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "all")}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              exportCsv(
                rows,
                `leads-${scan.data?.query ?? "scan"}-${scan.data?.city ?? scanId}.csv`
              )
            }
          >
            <Download /> CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Score</TableHead>
              {scan.data?.nearMe && <TableHead>Distance</TableHead>}
              <TableHead>Business</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={scan.data?.nearMe ? 7 : 6}
                  className="text-muted-foreground py-8 text-center"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : !rows.length ? (
              <TableRow>
                <TableCell
                  colSpan={scan.data?.nearMe ? 7 : 6}
                  className="text-muted-foreground py-8 text-center"
                >
                  No leads match the filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => setOpenLeadId(lead.id)}
                >
                  <TableCell className="font-semibold">{lead.score}</TableCell>
                  {scan.data?.nearMe && (
                    <TableCell>
                      {lead.distanceMiles !== null
                        ? `${lead.distanceMiles} mi`
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {lead.category ?? ""}
                      {lead.mapsUrl && (
                        <>
                          {lead.category ? " · " : ""}
                          <a
                            href={lead.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Maps
                          </a>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.rating ? (
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-current text-amber-500" />
                        {lead.rating} ({lead.reviewCount})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{websiteBadge(lead)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {statusSelect(lead)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={!!openLead}
        onOpenChange={(open) => !open && setOpenLeadId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {openLead && (
            <LeadSheet
              lead={openLead}
              niche={scan.data?.query ?? ""}
              city={scan.data?.city ?? ""}
              statusSelect={statusSelect(openLead, "default")}
              onSaveNotes={(notes) =>
                updateNotes.mutate({ id: openLead.id, notes })
              }
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const LeadSheet = ({
  lead,
  niche,
  city,
  statusSelect,
  onSaveNotes,
}: {
  lead: Lead;
  niche: string;
  city: string;
  statusSelect: React.ReactNode;
  onSaveNotes: (notes: string) => void;
}) => {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const script = callScript(lead, niche, city);
  const mapQuery = encodeURIComponent(
    `${lead.name} ${lead.address ?? `${city}`}`
  );

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 text-xl">{lead.name}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          {lead.category && <span>{lead.category}</span>}
          {websiteBadge(lead)}
          <Badge variant="outline">Score {lead.score}</Badge>
          {lead.distanceMiles !== null && (
            <Badge variant="outline">{lead.distanceMiles} mi away</Badge>
          )}
          {lead.rating ? (
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-current text-amber-500" />
              {lead.rating} ({lead.reviewCount} reviews)
            </span>
          ) : null}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        {lead.phone && (
          <Button asChild size="lg" className="w-full text-base">
            <a href={`tel:${lead.phone}`}>
              <Phone /> Call {lead.phone}
            </a>
          </Button>
        )}

        <div className="space-y-2">
          {lead.address && (
            <p className="text-muted-foreground text-sm">{lead.address}</p>
          )}
          <iframe
            title={`Map of ${lead.name}`}
            src={`https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`}
            className="aspect-video w-full rounded-md border"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="flex gap-2">
            {lead.mapsUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={lead.mapsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open in Google Maps
                </a>
              </Button>
            )}
            {lead.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={lead.website} target="_blank" rel="noreferrer">
                  <ExternalLink /> Website
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label>Pipeline</Label>
          {statusSelect}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Call script</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(script);
                toast.success("Script copied");
              }}
            >
              <Copy /> Copy
            </Button>
          </div>
          <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
            {script}
          </p>
        </div>

        <div>
          <Label htmlFor={`notes-${lead.id}`}>Notes</Label>
          <Textarea
            id={`notes-${lead.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1"
          />
          <Button size="sm" className="mt-2" onClick={() => onSaveNotes(notes)}>
            Save notes
          </Button>
        </div>
      </div>
    </>
  );
};

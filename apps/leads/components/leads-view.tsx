"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  Phone,
  Play,
  ScanSearch,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { BuyCreditsDialog } from "@/components/buy-credits-dialog";
import { InspectDialog } from "@/components/inspect-dialog";
import { MeetingScheduler } from "@/components/meeting-scheduler";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Input } from "@workspace/ui/components/input";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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

type Lead = RouterOutputs["leads"]["list"]["leads"][number];
type UnlockedLead = Extract<Lead, { locked: false }>;

const STATUSES = [
  "new",
  "contacted",
  "interested",
  "meeting",
  "won",
  "lost",
] as const;

function websiteBadge(lead: Lead) {
  const pill = "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";
  if (!lead.website)
    return <span className={`${pill} bg-rose-100 text-rose-600`}>No website</span>;
  if (lead.socialOnly)
    return (
      <span className={`${pill} bg-amber-100 text-amber-700`}>Social only</span>
    );
  if (lead.websiteDead)
    return (
      <span className={`${pill} bg-orange-100 text-orange-600`}>Site down</span>
    );
  return (
    <span className={`${pill} bg-emerald-100 text-emerald-700`}>Has site</span>
  );
}

function scoreChip(score: number) {
  const tone =
    score >= 70
      ? "bg-primary/10 text-primary"
      : score >= 50
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`flex size-9 items-center justify-center rounded-xl text-sm font-semibold ${tone}`}
    >
      {score}
    </span>
  );
}

// Own outreach script — filled from lead data.
function callScript(lead: UnlockedLead, niche: string, city: string) {
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

// 20-second no-answer version of the pitch.
function voicemailScript(lead: UnlockedLead, niche: string, city: string) {
  return `Hi, this message is for ${lead.name}.

My name is Ali, I build websites for ${niche} businesses around ${city}. I noticed your Google listing doesn't point to a working website, which means people who look you up online can't find you.

I put together a quick mockup of what a site for you could look like, free to check out. Give me a call back at your convenience, or I'll try you again tomorrow. Thanks!`;
}

function exportCsv(leads: UnlockedLead[], filename: string) {
  const header = [
    "Name",
    "Phone",
    "Email",
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
      l.email,
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

  const searchParams = useSearchParams();

  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true);
  // Persisted preference — hydrated in an effect so SSR markup stays stable.
  useEffect(() => {
    if (localStorage.getItem("leads:no-website-only") === "false") {
      setNoWebsiteOnly(false);
    }
  }, []);
  const toggleNoWebsiteOnly = (value: boolean) => {
    setNoWebsiteOnly(value);
    localStorage.setItem("leads:no-website-only", String(value));
  };
  const [status, setStatus] = useState<string>("all");
  // ?lead=<id> deep-links straight into a lead's sheet (meetings card rows).
  const [openLeadId, setOpenLeadId] = useState<number | null>(() => {
    const param = Number(searchParams.get("lead"));
    return Number.isInteger(param) && param > 0 ? param : null;
  });
  const [buyOpen, setBuyOpen] = useState(false);
  // Inspect dialog lives OUTSIDE the Sheet subtree — nesting a second Base UI
  // dialog inside the sheet popup swallowed the open, so the sheet passes the
  // website up and the dialog renders as a sibling above it.
  const [inspectWebsite, setInspectWebsite] = useState<string | null>(null);

  const scan = useQuery(trpc.leads.scan.get.queryOptions({ scanId }));
  const leads = useQuery(
    trpc.leads.list.queryOptions({
      scanId,
      noWebsiteOnly,
      status:
        status === "all" ? undefined : (status as (typeof STATUSES)[number]),
    })
  );
  const credits = useQuery(trpc.leads.credits.get.queryOptions());

  const invalidateLeads = () =>
    queryClient.invalidateQueries({ queryKey: trpc.leads.list.queryKey() });

  const updateStatus = useMutation(
    trpc.leads.updateStatus.mutationOptions({
      onSuccess: () => {
        invalidateLeads();
        // Dashboard cards keyed on status (won) stay in sync.
        queryClient.invalidateQueries({ queryKey: trpc.leads.won.queryKey() });
      },
    })
  );
  const updateNotes = useMutation(
    trpc.leads.updateNotes.mutationOptions({
      onSuccess: () => {
        invalidateLeads();
        toast.success("Notes saved");
      },
    })
  );
  const unlock = useMutation(
    trpc.leads.unlock.mutationOptions({
      onSuccess: (result) => {
        invalidateLeads();
        queryClient.invalidateQueries({
          queryKey: trpc.leads.credits.get.queryKey(),
        });
        toast.success(
          result.remainingLocked > 0
            ? `Unlocked ${result.unlocked} leads. ${result.remainingLocked} still locked.`
            : `Unlocked ${result.unlocked} leads`
        );
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const rows = leads.data?.leads ?? [];
  const lockedCount = leads.data?.lockedCount ?? 0;
  const balance = credits.data?.balance ?? 0;
  const openLead =
    rows.find((l): l is UnlockedLead => !l.locked && l.id === openLeadId) ??
    null;

  const statusSelect = (lead: UnlockedLead, size: "sm" | "default" = "sm") => (
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
          <Link
            href="/"
            className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
          >
            <ArrowLeft /> Scans
          </Link>
          {scan.data && (
            <h1 className="text-lg font-semibold tracking-tight capitalize">
              {scan.data.query === "manual" ? (
                "Manual additions"
              ) : (
                <>
                  {scan.data.query} —{" "}
                  {scan.data.nearMe
                    ? "near me"
                    : `${scan.data.city}, ${scan.data.state}`}
                </>
              )}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="no-website"
              checked={noWebsiteOnly}
              onCheckedChange={toggleNoWebsiteOnly}
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
          <button
            className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
            disabled={!rows.some((l) => !l.locked)}
            onClick={() =>
              exportCsv(
                rows.filter((l): l is UnlockedLead => !l.locked),
                `leads-${scan.data?.query ?? "scan"}-${scan.data?.city ?? scanId}.csv`
              )
            }
          >
            <Download /> CSV
          </button>
        </div>
      </div>

      {lockedCount > 0 && (
        <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Lock className="text-primary size-4" />
            {lockedCount} more {lockedCount === 1 ? "lead" : "leads"} in this
            scan {lockedCount === 1 ? "is" : "are"} locked
          </p>
          {balance > 0 ? (
            <button
              className="btn-pill btn-violet h-9 px-4 text-sm"
              disabled={unlock.isPending}
              onClick={() => unlock.mutate({ scanId })}
            >
              {unlock.isPending && <Loader2 className="animate-spin" />}
              Unlock {Math.min(balance, lockedCount)} for{" "}
              {Math.min(balance, lockedCount)}{" "}
              {Math.min(balance, lockedCount) === 1 ? "credit" : "credits"}
            </button>
          ) : (
            <button
              className="btn-pill btn-violet h-9 px-4 text-sm"
              onClick={() => setBuyOpen(true)}
            >
              Upgrade to unlock
            </button>
          )}
        </div>
      )}

      <div className="bg-card rounded-3xl p-2 shadow-sm">
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
              rows.map((lead) =>
                lead.locked ? (
                  <TableRow key={lead.id} className="opacity-70">
                    <TableCell>{scoreChip(lead.score)}</TableCell>
                    {scan.data?.nearMe && (
                      <TableCell>
                        {lead.distanceMiles !== null
                          ? `${lead.distanceMiles} mi`
                          : "–"}
                      </TableCell>
                    )}
                    <TableCell className="max-w-80">
                      <div className="bg-muted h-4 w-36 rounded-full" />
                      <div className="text-muted-foreground mt-1 text-xs">
                        {lead.category ?? "Locked lead"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-muted h-4 w-24 rounded-full" />
                    </TableCell>
                    <TableCell>
                      {lead.rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="size-3.5 fill-current text-amber-500" />
                          {lead.rating} ({lead.reviewCount})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell>{websiteBadge(lead)}</TableCell>
                    <TableCell>
                      <span className="bg-muted text-muted-foreground flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                        <Lock className="size-3" /> Locked
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => setOpenLeadId(lead.id)}
                >
                  <TableCell>{scoreChip(lead.score)}</TableCell>
                  {scan.data?.nearMe && (
                    <TableCell>
                      {lead.distanceMiles !== null
                        ? `${lead.distanceMiles} mi`
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell className="max-w-80 whitespace-normal">
                    <div className="font-medium break-words">
                      {lead.name}
                      {lead.startedAt && !lead.meetingAt && (
                        <span
                          title="In progress"
                          className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-400 align-middle"
                        />
                      )}
                    </div>
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
                )
              )
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={!!openLead}
        onOpenChange={(open) => !open && setOpenLeadId(null)}
      >
        <SheetContent
          className={`w-full overflow-y-auto transition-[max-width] duration-300 ${
            openLead?.startedAt ? "sm:max-w-2xl" : "sm:max-w-lg"
          }`}
        >
          {openLead && (
            <LeadSheet
              lead={openLead}
              niche={scan.data?.query ?? ""}
              city={scan.data?.city ?? ""}
              statusSelect={statusSelect(openLead, "default")}
              onSaveNotes={(notes) =>
                updateNotes.mutate({ id: openLead.id, notes })
              }
              onInspect={setInspectWebsite}
            />
          )}
        </SheetContent>
      </Sheet>

      <BuyCreditsDialog open={buyOpen} onOpenChange={setBuyOpen} />

      {inspectWebsite && (
        <InspectDialog
          key={inspectWebsite}
          website={inspectWebsite}
          open
          onOpenChange={(open) => !open && setInspectWebsite(null)}
        />
      )}
    </div>
  );
};

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
    <span className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide uppercase">
      {label}
    </span>
    <span className="min-w-0 text-right break-words">{children}</span>
  </div>
);

const ScriptBlock = ({ label, script }: { label: string; script: string }) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <Label>{label}</Label>
      <button
        className="btn-pill btn-light h-8 px-3 text-xs [&_svg]:size-3.5"
        onClick={() => {
          navigator.clipboard.writeText(script);
          toast.success(`${label} copied`);
        }}
      >
        <Copy /> Copy
      </button>
    </div>
    <p className="bg-muted rounded-2xl p-4 text-sm whitespace-pre-wrap">
      {script}
    </p>
  </div>
);

const LeadSheet = ({
  lead,
  niche,
  city,
  statusSelect,
  onSaveNotes,
  onInspect,
}: {
  lead: UnlockedLead;
  niche: string;
  city: string;
  statusSelect: React.ReactNode;
  onSaveNotes: (notes: string) => void;
  onInspect: (website: string) => void;
}) => {
  const trpc = useTRPC();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const started = !!lead.startedAt;

  const invalidateLeads = () =>
    queryClient.invalidateQueries({ queryKey: trpc.leads.list.queryKey() });
  const startWork = useMutation(
    trpc.leads.startWork.mutationOptions({ onSuccess: invalidateLeads })
  );
  const stopWork = useMutation(
    trpc.leads.stopWork.mutationOptions({ onSuccess: invalidateLeads })
  );
  const updateEmail = useMutation(
    trpc.leads.updateEmail.mutationOptions({
      onSuccess: () => {
        invalidateLeads();
        toast.success("Email saved");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const mapQuery = encodeURIComponent(
    `${lead.name} ${lead.address ?? `${city}`}`
  );
  const externalLinks = (
    <div className="flex flex-wrap gap-2">
      {lead.mapsUrl && (
        <a
          href={lead.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
        >
          <ExternalLink /> Open in Google Maps
        </a>
      )}
      {lead.website && (
        <>
          <a
            href={lead.website}
            target="_blank"
            rel="noreferrer"
            className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
          >
            <ExternalLink /> Website
          </a>
          <button
            className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
            onClick={() => onInspect(lead.website!)}
          >
            <ScanSearch /> Inspect
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 text-xl">{lead.name}</SheetTitle>
        {!started && (
          <SheetDescription className="flex flex-wrap items-center gap-2">
            {lead.category && <span>{lead.category}</span>}
            {websiteBadge(lead)}
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
              Score {lead.score}
            </span>
            {lead.distanceMiles !== null && (
              <span className="bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 text-xs font-medium">
                {lead.distanceMiles} mi away
              </span>
            )}
            {lead.rating ? (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-current text-amber-500" />
                {lead.rating} ({lead.reviewCount} reviews)
              </span>
            ) : null}
          </SheetDescription>
        )}
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="btn-pill btn-violet h-13 w-full text-base font-semibold [&_svg]:size-5"
          >
            <Phone /> Call {lead.phone}
          </a>
        )}

        {!started && (
          <button
            className="btn-pill btn-dark h-11 w-full text-sm font-semibold [&_svg]:size-4"
            disabled={startWork.isPending}
            onClick={() => startWork.mutate({ id: lead.id })}
          >
            {startWork.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play />
            )}
            Start working this lead
          </button>
        )}

        {started && (
          <div className="flex justify-end">
            <button
              className="btn-pill btn-light h-8 px-3 text-xs [&_svg]:size-3.5"
              disabled={stopWork.isPending}
              onClick={() => stopWork.mutate({ id: lead.id })}
            >
              {stopWork.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <X />
              )}
              Exit work mode
            </button>
          </div>
        )}

        {started ? (
          // Working mode: compact colored fact list instead of pills + map,
          // so scripts and inputs get the room.
          <div className="divide-border bg-card divide-y rounded-2xl border text-sm">
            <InfoRow label="Website">
              <span className="inline-flex items-center gap-1.5">
                {!lead.website ? (
                  <span className="font-medium text-rose-600">No website</span>
                ) : lead.socialOnly ? (
                  <span className="font-medium text-amber-600">
                    Social only
                  </span>
                ) : lead.websiteDead ? (
                  <span className="font-medium text-orange-600">
                    Site down
                  </span>
                ) : (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 underline"
                  >
                    {lead.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {lead.website && (
                  <button
                    title="Inspect site"
                    aria-label="Inspect site"
                    onClick={() => onInspect(lead.website!)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors"
                  >
                    <ScanSearch className="size-3.5" />
                  </button>
                )}
              </span>
            </InfoRow>
            {lead.phone && (
              <InfoRow label="Phone">
                <a href={`tel:${lead.phone}`} className="font-medium underline">
                  {lead.phone}
                </a>
              </InfoRow>
            )}
            {lead.address && (
              <InfoRow label="Address">
                {lead.mapsUrl ? (
                  <a
                    href={lead.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {lead.address}
                  </a>
                ) : (
                  lead.address
                )}
              </InfoRow>
            )}
            {lead.category && (
              <InfoRow label="Category">{lead.category}</InfoRow>
            )}
            <InfoRow label="Score">
              <span className="text-primary font-semibold">{lead.score}</span>
            </InfoRow>
            {lead.rating ? (
              <InfoRow label="Rating">
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-current text-amber-500" />
                  {lead.rating} ({lead.reviewCount} reviews)
                </span>
              </InfoRow>
            ) : null}
            {lead.distanceMiles !== null && (
              <InfoRow label="Distance">
                <span className="font-medium text-emerald-700">
                  {lead.distanceMiles} mi away
                </span>
              </InfoRow>
            )}
            <div className="px-4 py-3">{externalLinks}</div>
          </div>
        ) : (
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
            {externalLinks}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Label>Pipeline</Label>
          {statusSelect}
        </div>

        {started ? (
          <div>
            {/* flex-col inline: the ui Tabs relies on a data-horizontal
                custom variant no app defines, so stacking is broken there. */}
            <Tabs defaultValue="call" className="flex-col">
              <TabsList className="gap-1 rounded-full p-1">
                <TabsTrigger
                  value="call"
                  className="h-auto flex-none rounded-full px-4 py-1.5 data-active:shadow-sm"
                >
                  Call script
                </TabsTrigger>
                <TabsTrigger
                  value="voicemail"
                  className="h-auto flex-none rounded-full px-4 py-1.5 data-active:shadow-sm"
                >
                  Voicemail
                </TabsTrigger>
              </TabsList>
              <TabsContent value="call">
                <ScriptBlock
                  label="Call script"
                  script={callScript(lead, niche, city)}
                />
              </TabsContent>
              <TabsContent value="voicemail">
                <ScriptBlock
                  label="Voicemail script"
                  script={voicemailScript(lead, niche, city)}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <ScriptBlock
            label="Call script"
            script={callScript(lead, niche, city)}
          />
        )}

        {started && (
          <>
            <div>
              <Label htmlFor={`email-${lead.id}`}>Contact email</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id={`email-${lead.id}`}
                  type="email"
                  placeholder="owner@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className="btn-pill btn-light h-9 px-4 text-sm"
                  disabled={
                    updateEmail.isPending || email === (lead.email ?? "")
                  }
                  onClick={() => updateEmail.mutate({ id: lead.id, email })}
                >
                  Save
                </button>
              </div>
            </div>

            <MeetingScheduler
              leadId={lead.id}
              email={email}
              meetingAt={lead.meetingAt ? new Date(lead.meetingAt) : null}
              meetingUrl={lead.meetingUrl}
            />
          </>
        )}

        <div>
          <Label htmlFor={`notes-${lead.id}`}>Notes</Label>
          <Textarea
            id={`notes-${lead.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1"
          />
          <button
            className="btn-pill btn-dark mt-2 h-9 px-4 text-sm"
            onClick={() => onSaveNotes(notes)}
          >
            Save notes
          </button>
        </div>
      </div>
    </>
  );
};

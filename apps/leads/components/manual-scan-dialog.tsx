"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { useTRPC } from "@workspace/trpc/client";

// Every ISO 3166-1 alpha-2 region Google accepts as a CLDR regionCode.
// Names and flags are derived at runtime so this stays a flat code list.
// prettier-ignore
const REGION_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];

const regionDisplayName = new Intl.DisplayNames(["en"], { type: "region" });

const regionFlag = (code: string) =>
  String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );

// Sorted by display name, US pinned on top as the default market.
const REGIONS = REGION_CODES.map((code) => ({
  code,
  name: regionDisplayName.of(code) ?? code,
}))
  .sort((a, b) =>
    a.code === "US" ? -1 : b.code === "US" ? 1 : a.name.localeCompare(b.name)
  );

type ManualResult = {
  placeId: string;
  name: string;
  address: string | null;
  isAddress: boolean;
  lat: number | null;
  lng: number | null;
};

// One billed Google call max per pause in typing — never per keystroke.
function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export const ManualScanDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("US");
  const debouncedQuery = useDebouncedValue(query, 500);
  // Set when an address row was picked: its businesses replace the results.
  const [addressResults, setAddressResults] = useState<ManualResult[] | null>(
    null
  );

  const search = useQuery(
    trpc.leads.manual.search.queryOptions(
      { query: debouncedQuery.trim(), region },
      {
        enabled: open && debouncedQuery.trim().length >= 3,
        // Each fetch is a billed Google call — cache hard, never refire.
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
      }
    )
  );

  const atAddress = useMutation(
    trpc.leads.manual.atAddress.mutationOptions({
      onSuccess: (data) => setAddressResults(data.results),
      onError: (error) => toast.error(error.message),
    })
  );

  const add = useMutation(
    trpc.leads.manual.add.mutationOptions({
      onSuccess: (data, variables) => {
        const picked = [...(addressResults ?? []), ...results].find(
          (r) => r.placeId === variables.placeId
        );
        if (data.existing) {
          toast.info(`${picked?.name ?? "This business"} is already in your leads`);
        } else {
          toast.success(
            `Added ${picked?.name ?? "business"}${
              data.billable ? " for 1 credit" : " free"
            }`
          );
        }
        onOpenChange(false);
        router.push(`/scans/${data.scanId}?lead=${data.leadId}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const results = addressResults ?? search.data?.results ?? [];
  const searching = search.isFetching || debouncedQuery !== query;

  const pick = (result: ManualResult) => {
    if (add.isPending || atAddress.isPending) return;
    if (result.isAddress) {
      if (result.lat === null || result.lng === null) {
        toast.error("Google returned no location for that address.");
        return;
      }
      atAddress.mutate({ lat: result.lat, lng: result.lng });
    } else {
      add.mutate({ placeId: result.placeId });
    }
  };

  const reset = () => {
    setQuery("");
    setAddressResults(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a business</DialogTitle>
          <DialogDescription>
            Search by name or address. Picking an address lists the businesses
            at it. Real prospects cost 1 credit, businesses with a healthy
            website are free.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            {searching && query.trim().length >= 3 ? (
              <Loader2 className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin" />
            ) : (
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            )}
            <Input
              autoFocus
              placeholder="Baxter Restoration, or 8880 Corporate Square Ct..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAddressResults(null);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={region}
            onValueChange={(value) => {
              if (!value) return;
              setRegion(value);
              setAddressResults(null);
            }}
          >
            <SelectTrigger
              aria-label="Search region"
              className="w-24 shrink-0 data-[size=default]:h-9"
            >
              <SelectValue>
                {regionFlag(region)} {region}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {regionFlag(r.code)} {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {addressResults && (
          <button
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-xs font-medium"
            onClick={() => setAddressResults(null)}
          >
            <ArrowLeft className="size-3.5" /> Back to search results
          </button>
        )}

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {search.isError ? (
            <p className="text-destructive py-4 text-center text-sm">
              {search.error.message}
            </p>
          ) : atAddress.isPending ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Finding businesses at that address…
            </p>
          ) : !results.length ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              {addressResults
                ? "No businesses found at that address."
                : debouncedQuery.trim().length >= 3 && !searching
                  ? "No matches. Try adding the city."
                  : "Type at least 3 characters."}
            </p>
          ) : (
            results.map((result) => (
              <button
                key={result.placeId}
                disabled={add.isPending}
                onClick={() => pick(result)}
                className="hover:bg-muted/70 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    result.isAddress
                      ? "bg-amber-100 text-amber-600"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {result.isAddress ? (
                    <MapPin className="size-4" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {result.name}
                    {add.isPending &&
                      add.variables?.placeId === result.placeId && (
                        <Loader2 className="ml-1.5 inline size-3.5 animate-spin" />
                      )}
                  </span>
                  {result.address && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {result.address}
                    </span>
                  )}
                </span>
                {result.isAddress && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                    Address
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

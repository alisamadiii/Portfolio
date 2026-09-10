"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
import { Progress } from "@workspace/ui/components/progress";

import { queryClient, useTRPC } from "@workspace/trpc/client";

const NICHES = [
  "plumbers",
  "HVAC",
  "roofers",
  "electricians",
  "landscaping",
  "pressure washing",
  "pool service",
  "pest control",
  "tree service",
  "movers",
  "cleaning service",
  "auto detailing",
  "towing",
  "barbers",
  "hair salons",
  "med spas",
  "dentists",
  "chiropractors",
  "general contractors",
  "painters",
  "fencing",
  "garage door repair",
  "appliance repair",
  "handyman",
];

// Suggestions only — any typed city is accepted. FL mirrors the agency's
// 15 metro pages; other states get their biggest metros.
const CITIES: Record<string, string[]> = {
  AL: ["Birmingham", "Huntsville", "Montgomery", "Mobile", "Tuscaloosa"],
  AK: ["Anchorage", "Fairbanks", "Juneau"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Scottsdale", "Chandler", "Glendale"],
  AR: ["Little Rock", "Fayetteville", "Fort Smith", "Springdale"],
  CA: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim"],
  CO: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Boulder"],
  CT: ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury"],
  DE: ["Wilmington", "Dover", "Newark"],
  FL: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Fort Lauderdale", "Hialeah", "Tallahassee", "Cape Coral", "Port St. Lucie", "Pembroke Pines", "Hollywood", "Gainesville", "West Palm Beach", "Sarasota", "Fort Myers", "Naples"],
  GA: ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens", "Macon"],
  HI: ["Honolulu", "Hilo", "Kailua"],
  ID: ["Boise", "Meridian", "Nampa", "Idaho Falls"],
  IL: ["Chicago", "Aurora", "Naperville", "Joliet", "Rockford", "Springfield"],
  IN: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel"],
  IA: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City"],
  KS: ["Wichita", "Overland Park", "Kansas City", "Topeka", "Olathe"],
  KY: ["Louisville", "Lexington", "Bowling Green", "Owensboro"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette"],
  ME: ["Portland", "Lewiston", "Bangor"],
  MD: ["Baltimore", "Columbia", "Germantown", "Silver Spring", "Frederick"],
  MA: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell"],
  MI: ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor", "Lansing"],
  MN: ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington"],
  MS: ["Jackson", "Gulfport", "Southaven", "Biloxi"],
  MO: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence"],
  MT: ["Billings", "Missoula", "Great Falls", "Bozeman"],
  NE: ["Omaha", "Lincoln", "Bellevue", "Grand Island"],
  NV: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks"],
  NH: ["Manchester", "Nashua", "Concord"],
  NJ: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Trenton"],
  NM: ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe"],
  NY: ["New York", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany"],
  NC: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington"],
  ND: ["Fargo", "Bismarck", "Grand Forks"],
  OH: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton"],
  OK: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond"],
  OR: ["Portland", "Salem", "Eugene", "Gresham", "Bend"],
  PA: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton"],
  RI: ["Providence", "Warwick", "Cranston", "Pawtucket"],
  SC: ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Greenville", "Myrtle Beach"],
  SD: ["Sioux Falls", "Rapid City", "Aberdeen"],
  TN: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro"],
  TX: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo"],
  UT: ["Salt Lake City", "West Valley City", "Provo", "St. George", "Ogden"],
  VT: ["Burlington", "South Burlington", "Rutland"],
  VA: ["Virginia Beach", "Chesapeake", "Norfolk", "Richmond", "Arlington", "Newport News"],
  WA: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Everett"],
  WV: ["Charleston", "Huntington", "Morgantown"],
  WI: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine"],
  WY: ["Cheyenne", "Casper", "Laramie"],
};

// prettier-ignore
const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// Dropdown suggestions + free typing: selection fills the field, but any
// typed value is used as-is on submit.
const SuggestInput = ({
  value,
  onChange,
  items,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  items: string[];
  placeholder: string;
  className?: string;
}) => {
  return (
    <Combobox
      items={items}
      inputValue={value}
      onInputValueChange={(next) => onChange(next ?? "")}
      value={items.includes(value) ? value : null}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        required
        minLength={2}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>No matches — free text works too</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export const ScanDashboard = () => {
  const trpc = useTRPC();
  const router = useRouter();

  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("FL");

  const scans = useQuery(trpc.leads.scan.list.queryOptions());
  const runScan = useMutation(trpc.leads.scan.run.mutationOptions());

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    runScan.mutate(
      { niche, city, state },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({
            queryKey: trpc.leads.scan.list.queryKey(),
          });
          toast.success(
            `Found ${result.totalFound} businesses, ${result.noWebsiteCount} without a real website`
          );
          router.push(`/scans/${result.scanId}`);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const usage = scans.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New scan</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleScan}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <SuggestInput
              value={niche}
              onChange={setNiche}
              items={NICHES}
              placeholder="Niche (e.g. plumbers)"
              className="flex-1"
            />
            <SuggestInput
              value={city}
              onChange={setCity}
              items={CITIES[state.trim().toUpperCase()] ?? []}
              placeholder="City (e.g. Cape Coral)"
              className="flex-1"
            />
            <SuggestInput
              value={state}
              onChange={setState}
              items={STATES}
              placeholder="State"
              className="sm:max-w-28"
            />
            <Button
              type="submit"
              disabled={runScan.isPending || usage?.scansLeft === 0}
            >
              {runScan.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search />
              )}
              Scan
            </Button>
          </form>
          {usage && (
            <div className="mt-4 space-y-1.5">
              <Progress
                value={(usage.monthApiCalls / usage.freeTier) * 100}
                className={
                  usage.monthApiCalls / usage.freeTier >= 0.8
                    ? "[&>[data-slot=progress-indicator]]:bg-destructive"
                    : undefined
                }
              />
              <p className="text-muted-foreground text-sm">
                {usage.monthApiCalls} / {usage.freeTier} free Google API calls
                used this month — about {usage.scansLeft} scans left. Scans are
                blocked at the limit so nothing gets billed; resets on the 1st.
              </p>
              {usage.scansLeft === 0 && (
                <p className="text-destructive text-sm font-medium">
                  Free tier exhausted — scanning re-opens next month.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent>
          {scans.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !usage?.scans.length ? (
            <p className="text-muted-foreground text-sm">
              No scans yet. Pick a niche and city above.
            </p>
          ) : (
            <ul className="divide-y">
              {usage.scans.map((scan) => (
                <li key={scan.id}>
                  <Link
                    href={`/scans/${scan.id}`}
                    className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-md px-2 py-3"
                  >
                    <div>
                      <span className="font-medium capitalize">
                        {scan.query}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        — {scan.city}, {scan.state}
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {scan.createdAt
                          ? new Date(scan.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {scan.status === "error" ? (
                        <Badge variant="destructive">error</Badge>
                      ) : (
                        <>
                          <Badge variant="secondary">
                            {scan.totalFound} found
                          </Badge>
                          <Badge>{scan.noWebsiteCount} leads</Badge>
                        </>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

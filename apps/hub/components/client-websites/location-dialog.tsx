"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";

import { ButtonAnchor } from "@/components/ds/ui/button";

type Location = { name: string; address: string };

/** Address link that opens a driving route from the agency to the client (keyless Google Maps embed). */
export function LocationDialog({ name, address }: Location) {
  return (
    <Dialog>
      <DialogTrigger className="relative z-10 flex items-start gap-1.5 text-left text-[13px] text-dim hover:text-ink hover:underline">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {address}
      </DialogTrigger>
      <DialogContent className="md:max-w-4xl">
        <Content name={name} address={address} />
      </DialogContent>
    </Dialog>
  );
}

function Content({ name, address }: Location) {
  const trpc = useTRPC();
  const config = useQuery(trpc.clientWebsites.config.queryOptions());
  const origin = config.data?.originAddress ?? null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>{address}</DialogDescription>
      </DialogHeader>
      {config.isPending && <div className="h-[min(60dvh,600px)] w-full animate-pulse rounded-card bg-subtle" />}
      {config.isError && <p className="text-[13px] text-danger">Couldn&apos;t load the map.</p>}
      {config.data && (
        <>
          <iframe
            src={embedUrl(origin, address)}
            title={`Route to ${name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[min(60dvh,600px)] w-full rounded-card border-0"
          />
          <ButtonAnchor
            size="sm"
            href={directionsUrl(origin, address)}
            target="_blank"
            rel="noreferrer"
            trailingIcon={<ExternalLink className="size-3.5" />}
            className="justify-self-start"
          >
            Open in Google Maps
          </ButtonAnchor>
        </>
      )}
    </>
  );
}

// Keyless embed, same as the lead map in apps/leads. Without an origin it falls
// back to a map of the client.
const embedUrl = (origin: string | null, destination: string) =>
  `https://maps.google.com/maps?${new URLSearchParams({
    ...(origin ? { saddr: origin, daddr: destination, dirflg: "d" } : { q: destination }),
    output: "embed",
  })}`;

const directionsUrl = (origin: string | null, destination: string) =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1",
    ...(origin ? { origin } : {}),
    destination,
    travelmode: "driving",
  })}`;

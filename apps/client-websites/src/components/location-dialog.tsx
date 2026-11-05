import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { getConfig } from "@/lib/api";

type Location = { name: string; address: string };

export const LocationDialog = ({ name, address }: Location) => (
  <Dialog>
    <DialogTrigger
      render={
        <Button
          variant="ghost"
          className="text-muted-foreground relative z-10 h-auto items-start justify-start gap-1.5 p-0 text-left font-normal whitespace-normal hover:bg-transparent hover:underline dark:hover:bg-transparent"
        />
      }
    >
      <MapPinIcon className="mt-0.5 size-3.5" />
      {address}
    </DialogTrigger>
    <DialogContent className="md:max-w-4xl">
      <Content name={name} address={address} />
    </DialogContent>
  </Dialog>
);

const Content = ({ name, address }: Location) => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });
  const origin = data?.originAddress ?? null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>{address}</DialogDescription>
      </DialogHeader>

      {isPending && (
        <Skeleton className="h-[min(60dvh,600px)] w-full rounded-lg" />
      )}
      {isError && (
        <p className="text-destructive text-sm">Could not load the map.</p>
      )}
      {data && (
        <>
          <iframe
            src={embedUrl(origin, address)}
            title={`Route to ${name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[min(60dvh,600px)] w-full rounded-lg border-0"
          />
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            render={
              <a
                href={directionsUrl(origin, address)}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Open in Google Maps
            <ExternalLinkIcon />
          </Button>
        </>
      )}
    </>
  );
};

// Keyless embed, same as the lead map in apps/leads. Without an origin it falls
// back to a map of the client.
const embedUrl = (origin: string | null, destination: string) =>
  `https://maps.google.com/maps?${new URLSearchParams({
    ...(origin
      ? { saddr: origin, daddr: destination, dirflg: "d" }
      : { q: destination }),
    output: "embed",
  })}`;

const directionsUrl = (origin: string | null, destination: string) =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1",
    ...(origin ? { origin } : {}),
    destination,
    travelmode: "driving",
  })}`;

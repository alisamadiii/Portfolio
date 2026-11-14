"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  ExternalLink,
  Globe,
  Info,
  Presentation,
  Star,
  Video,
} from "lucide-react";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import {
  httpUrl,
  INDEX_FILE,
  PRESENTATION_FILE,
  PREVIEW_VIDEO_FILE,
  type ClientWebsiteDetail,
} from "@workspace/trpc/lib/client-websites-shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";

import { Button, ButtonAnchor, ButtonLink, IconButton } from "@/components/ds/ui/button";
import { EmptyState } from "@/components/ds/ui/misc";
import { isAdminUser } from "@/lib/authz-shared";
import { formatDate, siteFileUrl, siteUrl } from "@/lib/client-websites";

import { ImportDialog } from "./import-dialog";
import { LocationDialog } from "./location-dialog";
import { PaymentDialog } from "./payment-dialog";

/**
 * One design, full height, to walk a client through it: pages, the
 * presentation deck, the showcase video, a Stripe payment link, the Google
 * Maps + Claude Design info, and Import into Sites.
 */
export function WebsiteDetail({ slug }: { slug: string }) {
  const user = useCurrentUser();
  const isAdmin = isAdminUser(user.data?.user);
  const trpc = useTRPC();
  const website = useQuery(trpc.clientWebsites.get.queryOptions({ slug }, { enabled: isAdmin }));
  // `load` remounts the iframe, so picking a page works even after the client
  // has clicked around inside the preview (it's cross-origin, so those clicks
  // can't be followed).
  const [frame, setFrame] = useState({ page: INDEX_FILE, load: 0 });
  // last site page shown, so leaving the presentation returns to it
  const [sitePage, setSitePage] = useState(INDEX_FILE);
  const [info, setInfo] = useState(false);
  const [importing, setImporting] = useState(false);

  const data = website.data;
  const name = data?.meta?.name ?? slug;
  const presenting = frame.page === PRESENTATION_FILE;
  const open = (page: string) => {
    setFrame(({ load }) => ({ page, load: load + 1 }));
    if (page !== PRESENTATION_FILE) setSitePage(page);
  };

  if (!user.isPending && !isAdmin) {
    return (
      <EmptyState
        icon={<Globe className="size-5" />}
        title="Admins only"
        text="Client websites are only visible to the agency team."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <ButtonLink
          href="/client-websites"
          size="sm"
          variant="outline"
          aria-label="All client websites"
          icon={<ArrowLeft className="size-4" />}
        />
        <h1 className="min-w-0 truncate text-base font-semibold">{name}</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {data && data.pages.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" trailingIcon={<ChevronDown className="size-3.5" />}>
                    {presenting ? "Pages" : frame.page}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-auto min-w-48">
                {data.pages.map((page) => (
                  <DropdownMenuItem key={page} onClick={() => open(page)}>
                    {page}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {data &&
            (data.hasPresentation ? (
              <Button
                size="sm"
                variant={presenting ? "dark" : "outline"}
                onClick={() => open(presenting ? sitePage : PRESENTATION_FILE)}
                icon={presenting ? <Globe className="size-4" /> : <Presentation className="size-4" />}
              >
                {presenting ? "Website" : "Presentation"}
              </Button>
            ) : (
              <Button size="sm" disabled>
                No presentation
              </Button>
            ))}
          {data?.hasPreviewVideo && (
            <ButtonAnchor
              size="sm"
              href={siteFileUrl(slug, PREVIEW_VIDEO_FILE)}
              target="_blank"
              rel="noreferrer"
              title="Listed on the agency site's /showcase"
              icon={<Video className="size-4" />}
            >
              Showcase video
            </ButtonAnchor>
          )}
          {data && <PaymentDialog slug={slug} name={data.meta?.business?.name ?? ""} />}
          {data && (
            <Button size="sm" variant="primary" icon={<Download className="size-4" />} onClick={() => setImporting(true)}>
              Import
            </Button>
          )}
          <a
            href={siteUrl(slug, frame.page)}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <ExternalLink className="size-4" />
          </a>
          {data && (
            <IconButton aria-label="Website info" onClick={() => setInfo(true)}>
              <Info className="size-4" />
            </IconButton>
          )}
        </div>
      </header>

      {website.isPending && isAdmin && <div className="m-4 flex-1 animate-pulse rounded-card bg-subtle" />}
      {website.isError && (
        <EmptyState icon={<Globe className="size-5" />} title="Couldn't load this website" text={website.error.message} />
      )}
      {data && (
        <iframe
          key={frame.load}
          src={siteUrl(slug, frame.page)}
          title={name}
          className="w-full flex-1 border-0 bg-white"
          // the deck has its own fullscreen button
          allow="fullscreen"
          // arrow keys reach the slides without a click first
          onLoad={(event) => event.currentTarget.contentWindow?.focus()}
        />
      )}

      {data && (
        <Sheet open={info} onOpenChange={setInfo}>
          <SheetContent className="overflow-y-auto">
            <WebsiteInfo website={data} />
          </SheetContent>
        </Sheet>
      )}
      {data && (
        <ImportDialog
          open={importing}
          onOpenChange={setImporting}
          slug={slug}
          defaultName={data.meta?.business?.name || data.meta?.name || slug}
        />
      )}
    </div>
  );
}

function WebsiteInfo({ website }: { website: ClientWebsiteDetail }) {
  const { slug, meta, metaStatus, updatedAt, pages } = website;
  const business = meta?.business;
  const design = meta?.design;
  const mapsUrl = httpUrl(business?.mapsUrl);
  const site = httpUrl(business?.website);
  const chatUrl = httpUrl(design?.chatUrl);
  const date = formatDate(updatedAt);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{meta?.name ?? slug}</SheetTitle>
        <SheetDescription>
          {pages.length} {pages.length === 1 ? "page" : "pages"}
          {date && ` · uploaded ${date}`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-6 px-4 pb-6 text-sm text-ink">
        {metaStatus !== "ok" && (
          <p className="text-dim">
            {metaStatus === "missing" ? "This folder has no _meta.json." : "This folder's _meta.json is not valid."}
          </p>
        )}

        {business && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Google Maps</h2>
            <dl className="flex flex-col gap-3">
              <Row label="Business">{business.name}</Row>
              <Row label="Category">{business.category}</Row>
              <Row label="Address">
                {business.address && <LocationDialog name={meta?.name ?? slug} address={business.address} />}
              </Row>
              <Row label="Phone">
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="text-coral-text hover:underline">
                    {business.phone}
                  </a>
                )}
              </Row>
              <Row label="Current website">
                {site && (
                  <a href={site} target="_blank" rel="noreferrer" className="break-all text-coral-text hover:underline">
                    {site}
                  </a>
                )}
              </Row>
              <Row label="Rating">
                {business.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5 fill-coral text-coral" aria-hidden />
                    {business.rating.toFixed(1)}
                    {business.reviewCount != null && ` (${business.reviewCount} reviews)`}
                  </span>
                )}
              </Row>
              <Row label="Hours">
                {business.hours?.length ? (
                  <ul className="flex flex-col gap-0.5">
                    {business.hours.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </Row>
            </dl>
            {mapsUrl && (
              <ButtonAnchor
                size="sm"
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                trailingIcon={<ExternalLink className="size-3.5" />}
                className="self-start"
              >
                Open in Google Maps
              </ButtonAnchor>
            )}
          </section>
        )}

        {design && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Claude Design</h2>
            <dl className="flex flex-col gap-3">
              <Row label="Session">{design.title}</Row>
              <Row label="Notes">{design.notes && <span className="whitespace-pre-wrap">{design.notes}</span>}</Row>
            </dl>
            {chatUrl && (
              <ButtonAnchor
                size="sm"
                href={chatUrl}
                target="_blank"
                rel="noreferrer"
                trailingIcon={<ExternalLink className="size-3.5" />}
                className="self-start"
              >
                Open design chat
              </ButtonAnchor>
            )}
          </section>
        )}
      </div>
    </>
  );
}

// Renders nothing when the value is absent, so optional fields just drop out.
const Row = ({ label, children }: { label: string; children?: ReactNode }) =>
  children ? (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-dim">{label}</dt>
      <dd>{children}</dd>
    </div>
  ) : null;

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InfoIcon,
  PresentationIcon,
  StarIcon,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@workspace/ui/components/button";
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
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  formatDate,
  getProject,
  httpUrl,
  PRESENTATION,
  type ProjectDetail,
} from "@/lib/api";

import { LocationDialog } from "@/components/location-dialog";
import { PaymentDialog } from "@/components/payment-dialog";

const INDEX = "index.html";

// index.html pages are addressed by their folder so relative links resolve
const pageUrl = (slug: string, page: string) =>
  `/sites/${slug}/${page.replace(/(^|\/)index\.html$/, "$1")}`;

export const ProjectPage = () => {
  const { slug = "" } = useParams();
  const { data, isPending, isError } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => getProject(slug),
  });
  // `load` remounts the iframe, so picking a page works even after the client
  // has clicked around inside the preview. `current` follows those clicks.
  const [frame, setFrame] = useState({ page: INDEX, load: 0 });
  const [current, setCurrent] = useState(INDEX);
  // last site page shown, so leaving the presentation returns to it
  const [sitePage, setSitePage] = useState(INDEX);

  const name = data?.meta?.name ?? slug;
  const presenting = current === PRESENTATION;
  const open = (page: string) => {
    setFrame(({ load }) => ({ page, load: load + 1 }));
    setCurrent(page);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="All projects"
          render={<Link to="/" />}
        >
          <ArrowLeftIcon />
        </Button>
        <h1 className="truncate text-sm font-medium">{name}</h1>

        <div className="ml-auto flex items-center gap-2">
          {data && data.pages.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                {presenting ? "Pages" : current}
                <ChevronDownIcon />
              </DropdownMenuTrigger>
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
                variant={presenting ? "default" : "outline"}
                size="sm"
                onClick={() => open(presenting ? sitePage : PRESENTATION)}
              >
                {presenting ? <GlobeIcon /> : <PresentationIcon />}
                {presenting ? "Website" : "Presentation"}
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                No presentation
              </Button>
            ))}
          {data && (
            <PaymentDialog slug={slug} name={data.meta?.business?.name ?? ""} />
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open in new tab"
            render={
              <a
                href={pageUrl(slug, current)}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <ExternalLinkIcon />
          </Button>
          {data && (
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Project info"
                  />
                }
              >
                <InfoIcon />
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <ProjectInfo project={data} />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {isPending && <Skeleton className="m-4 flex-1" />}
      {isError && (
        <p className="text-destructive p-4 text-sm">
          Could not load this project.
        </p>
      )}
      {data && (
        <iframe
          key={frame.load}
          src={pageUrl(slug, frame.page)}
          title={name}
          className="w-full flex-1 border-0"
          // the deck has its own fullscreen button
          allow="fullscreen"
          onLoad={(event) => {
            const preview = event.currentTarget.contentWindow;
            // arrow keys reach the slides without a click first
            preview?.focus();
            // same origin, so the preview's location is readable
            const path = preview?.location.pathname;
            const prefix = `/sites/${slug}/`;
            if (!path?.startsWith(prefix)) return;
            const rest = decodeURIComponent(path.slice(prefix.length));
            const page =
              rest === "" || rest.endsWith("/") ? `${rest}${INDEX}` : rest;
            setCurrent(page);
            if (page !== PRESENTATION) setSitePage(page);
          }}
        />
      )}
    </div>
  );
};

const ProjectInfo = ({ project }: { project: ProjectDetail }) => {
  const { slug, meta, metaStatus, updatedAt, pages } = project;
  const business = meta?.business;
  const design = meta?.design;
  const mapsUrl = httpUrl(business?.mapsUrl);
  const website = httpUrl(business?.website);
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

      <div className="flex flex-col gap-6 px-4 pb-6 text-sm">
        {metaStatus !== "ok" && (
          <p className="text-muted-foreground">
            {metaStatus === "missing"
              ? "This folder has no _meta.json."
              : "This folder's _meta.json is not valid."}
          </p>
        )}

        {business && (
          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Google Maps</h2>
            <dl className="flex flex-col gap-3">
              <Row label="Business">{business.name}</Row>
              <Row label="Category">{business.category}</Row>
              <Row label="Address">
                {business.address && (
                  <LocationDialog
                    name={meta?.name ?? slug}
                    address={business.address}
                  />
                )}
              </Row>
              <Row label="Phone">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="underline underline-offset-4"
                  >
                    {business.phone}
                  </a>
                )}
              </Row>
              <Row label="Current website">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline underline-offset-4"
                  >
                    {website}
                  </a>
                )}
              </Row>
              <Row label="Rating">
                {business.rating != null && (
                  <span className="flex items-center gap-1">
                    <StarIcon className="size-3.5" />
                    {business.rating.toFixed(1)}
                    {business.reviewCount != null &&
                      ` (${business.reviewCount} reviews)`}
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
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                render={<a href={mapsUrl} target="_blank" rel="noreferrer" />}
              >
                Open in Google Maps
                <ExternalLinkIcon />
              </Button>
            )}
          </section>
        )}

        {design && (
          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Claude Design</h2>
            <dl className="flex flex-col gap-3">
              <Row label="Session">{design.title}</Row>
              <Row label="Notes">
                {design.notes && (
                  <span className="whitespace-pre-wrap">{design.notes}</span>
                )}
              </Row>
            </dl>
            {chatUrl && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                render={<a href={chatUrl} target="_blank" rel="noreferrer" />}
              >
                Open design chat
                <ExternalLinkIcon />
              </Button>
            )}
          </section>
        )}
      </div>
    </>
  );
};

// Renders nothing when the value is absent, so optional fields just drop out.
const Row = ({ label, children }: { label: string; children?: ReactNode }) =>
  children ? (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  ) : null;

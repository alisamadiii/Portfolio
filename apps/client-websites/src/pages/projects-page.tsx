import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { formatDate, getProjects, type Project } from "@/lib/api";
import { INDUSTRIES, industryOf, type Industry } from "@/lib/industries";

import { LocationDialog } from "@/components/location-dialog";

// 6 per page so the grid never mounts more than 6 site previews at once.
const PER_PAGE = 6;

// Filter state lives in the URL (?q, ?industry, ?page) so the back button and
// a reload keep the same view.
export const ProjectsPage = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
  const [params, setParams] = useSearchParams();

  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const needle = q.toLowerCase();
  const projects = (data ?? []).map((project) => ({
    project,
    industry: industryOf(
      project.meta?.showcase?.industry,
      project.meta?.business?.category
    ),
  }));
  // tabs: only industries that have at least one project, with counts
  const tabs = INDUSTRIES.map((i) => ({
    ...i,
    count: projects.filter((p) => p.industry === i.id).length,
  })).filter((t) => t.count > 0);
  const industryParam = params.get("industry");
  const industry = tabs.find((t) => t.id === industryParam)?.id ?? null;

  const matches = projects
    .filter(
      ({ project, industry: own }) =>
        (!industry || own === industry) &&
        (!needle ||
          [
            project.meta?.name,
            project.slug,
            project.meta?.business?.category,
            project.meta?.business?.address,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle))
    )
    .map((p) => p.project);
  const pageCount = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const page = Math.min(
    pageCount,
    Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1)
  );
  const shown = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const update = (next: {
    q?: string;
    industry?: Industry | null;
    page?: number;
  }) => {
    const out = new URLSearchParams();
    const nextQ = (next.q ?? q).trim();
    const nextIndustry =
      next.industry === undefined ? industry : next.industry;
    // a new search or tab starts from page 1
    const nextPage = next.page ?? 1;
    if (nextQ) out.set("q", nextQ);
    if (nextIndustry) out.set("industry", nextIndustry);
    if (nextPage > 1) out.set("page", String(nextPage));
    setParams(out, { replace: next.q !== undefined });
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl">Client websites</h1>
          {data && (
            <Badge variant="secondary" className="h-7 px-3 text-sm">
              {data.length} {data.length === 1 ? "project" : "projects"}
            </Badge>
          )}
        </div>

        {data && data.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav
              aria-label="Filter by industry"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0"
            >
              <IndustryTab
                active={industry === null}
                count={projects.length}
                onClick={() => update({ industry: null })}
              >
                All
              </IndustryTab>
              {tabs.map((t) => (
                <IndustryTab
                  key={t.id}
                  active={industry === t.id}
                  count={t.count}
                  onClick={() => update({ industry: t.id })}
                >
                  {t.label}
                </IndustryTab>
              ))}
            </nav>

            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="search"
                value={params.get("q") ?? ""}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search by name, category or city"
                aria-label="Search projects"
                className="h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => update({ q: "" })}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2"
                >
                  <XIcon />
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {isError && (
        <p className="text-destructive text-sm">
          Could not load projects from storage.
        </p>
      )}
      {data?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          The bucket has no project folders yet.
        </p>
      )}
      {data && data.length > 0 && matches.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No projects match{q ? ` "${q}"` : ""}
          {industry ? ` in ${tabs.find((t) => t.id === industry)?.label}` : ""}.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {isPending &&
          Array.from({ length: PER_PAGE }, (_, i) => (
            <Skeleton key={i} className="h-58 rounded-2xl" />
          ))}
        {shown.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Project pages"
          className="mt-10 flex flex-wrap items-center justify-center gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => update({ page: page - 1 })}
          >
            <ChevronLeftIcon />
            Previous
          </Button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              variant={n === page ? "outline" : "ghost"}
              size="icon-sm"
              aria-current={n === page ? "page" : undefined}
              onClick={() => update({ page: n })}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            disabled={page === pageCount}
            onClick={() => update({ page: page + 1 })}
          >
            Next
            <ChevronRightIcon />
          </Button>
        </nav>
      )}
    </main>
  );
};

const IndustryTab = ({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: string;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`focus-visible:ring-ring/50 inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] ${
      active
        ? "bg-foreground text-background"
        : "bg-muted text-foreground/80 hover:text-foreground"
    }`}
  >
    {children}
    <span className={active ? "text-background/60" : "text-muted-foreground"}>
      {count}
    </span>
  </button>
);

const ProjectCard = ({ project }: { project: Project }) => {
  const { slug, meta, metaStatus, updatedAt } = project;
  const business = meta?.business;
  const date = formatDate(updatedAt);

  return (
    <Card className="group hover:ring-primary/50 relative h-full rounded-2xl shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl sm:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-2 text-xl font-semibold tracking-tight">
            {/* Stretched over the card; the address button sits above it. */}
            <Link
              to={`/p/${slug}`}
              className="focus-visible:after:ring-ring outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2"
            >
              {meta?.name ?? slug}
            </Link>
            <ArrowUpRightIcon className="text-primary mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </CardTitle>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
            {business?.category && (
              <Badge className="bg-primary/15 text-primary">
                {business.category}
              </Badge>
            )}
            {metaStatus !== "ok" && (
              <Badge variant="outline">
                {metaStatus === "missing"
                  ? "No _meta.json"
                  : "Invalid _meta.json"}
              </Badge>
            )}
            {business?.rating != null && (
              <span className="text-foreground flex items-center gap-1">
                <StarIcon className="fill-primary text-primary size-3.5" />
                {business.rating.toFixed(1)}
                {business.reviewCount != null && (
                  <span className="text-muted-foreground">
                    ({business.reviewCount})
                  </span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground mt-auto flex flex-col gap-1.5">
          {business?.address && (
            <LocationDialog
              name={meta?.name ?? slug}
              address={business.address}
            />
          )}
          {date && <p className="text-xs">Uploaded {date}</p>}
        </CardContent>
      </div>
      <HomepageThumbnail slug={slug} />
    </Card>
  );
};

// The live homepage at a 1280x800 desktop viewport, scaled down. Display only:
// clicks fall through to the card's link.
const HomepageThumbnail = ({ slug }: { slug: string }) => (
  <div className="bg-muted ring-foreground/10 mx-4 h-40 w-64 shrink-0 overflow-hidden rounded-xl ring-1 sm:ml-0 sm:h-50 sm:w-80">
    <iframe
      src={`/sites/${slug}/`}
      title=""
      aria-hidden
      tabIndex={-1}
      loading="lazy"
      scrolling="no"
      className="pointer-events-none h-[800px] w-[1280px] origin-top-left scale-20 border-0 sm:scale-25"
    />
  </div>
);

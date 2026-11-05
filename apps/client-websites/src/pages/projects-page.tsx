import { useQuery } from "@tanstack/react-query";
import { ArrowUpRightIcon, StarIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { formatDate, getProjects, type Project } from "@/lib/api";

import { LocationDialog } from "@/components/location-dialog";

export const ProjectsPage = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10 flex items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">Client websites</h1>
        {data && (
          <Badge variant="secondary" className="h-7 px-3 text-sm">
            {data.length} {data.length === 1 ? "project" : "projects"}
          </Badge>
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

      <div className="grid gap-5 xl:grid-cols-2">
        {isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-58 rounded-2xl" />
          ))}
        {data?.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </main>
  );
};

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

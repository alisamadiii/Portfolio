"use client";

import type { ReactNode } from "react";
import { Building2 } from "lucide-react";

import { Spinner } from "@workspace/ui/components/spinner";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useEntitlement } from "@/hooks/use-plans";
import { useRouteProjectId } from "@/hooks/use-repo";

import { buttonClass } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { ProjectPaywall } from "@/components/settings/project-paywall";

import { useAgencyOptional } from "./use-agency";

/**
 * Wraps every page that reads agency data (leads, business info). The plan
 * decides first (paywall), then whether the site has an agency row at all
 * (empty state asking us to set it up). Children can call useAgency() safely.
 */
export function AgencyBoundary({
  children,
  header,
  title = "This app isn't set up for your site yet",
  text = "We switch it on for you. Send us a note and we'll have it ready within a day.",
}: {
  children: ReactNode;
  /** Rendered above the paywall / empty state (usually the page header). */
  header?: ReactNode;
  title?: string;
  text?: string;
}) {
  const projectId = useRouteProjectId();
  const { can, isLoading } = useEntitlement(projectId || undefined);
  const agency = useAgencyOptional();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="text-dim size-6" />
      </div>
    );
  }
  if (projectId && !can("leads")) {
    return (
      <>
        {header}
        <ProjectPaywall projectId={projectId} feature="leads" />
      </>
    );
  }
  if (!agency) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={title}
            text={text}
            action={
              <RequestDialog defaultSubject="Set up my site's apps">
                <span className={buttonClass("primary", "sm")}>
                  Contact support
                </span>
              </RequestDialog>
            }
          />
        </Card>
      </>
    );
  }
  return children;
}

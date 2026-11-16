"use client";

import { OriginsPage } from "@/components/agency/origins-page";
import { DeleteSiteCard } from "@/components/agency/settings/danger-page";
import { useAgencyOptional } from "@/components/agency/use-agency";
import { PageHeader } from "@/components/ds/layout/page-header";
import { siteName } from "@/components/ds/layout/top-bar";
import { EmptyState } from "@/components/ds/ui/misc";
import { Lock } from "@/components/icon";
import { NotifyEmailCard } from "@/components/settings/notify-email-card";
import { SiteLogoCard } from "@/components/settings/site-logo-card";
import { SiteNameCard } from "@/components/settings/site-name-card";
import { WebsiteUrlCard } from "@/components/settings/website-url-card";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";

/**
 * Project Settings, owner and admins only: the site's name and logo, its
 * address, where form submissions are emailed, the domains the lead script
 * may run on, and deleting the site.
 */
export function ProjectSettingsPage() {
  const projectId = useRouteProjectId();
  const project = useProject();
  const agency = useAgencyOptional();

  const header = (
    <PageHeader
      title="Settings"
      description="Your site's name, logo and address, where form submissions go, and deleting the site."
      docs="client-hub/settings#settings"
    />
  );

  if (project && !project.ownerOrAdmin) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Only the site owner can open Settings"
          text="Ask the owner of this site if something here needs to change."
        />
      </>
    );
  }

  return (
    <>
      {header}
      <SiteNameCard projectId={projectId} />
      <SiteLogoCard name={project?.name || siteName(project?.websiteUrl) || project?.repo || ""} />
      <WebsiteUrlCard projectId={projectId} />
      <NotifyEmailCard projectId={projectId} />
      {agency && <OriginsPage />}
      <DeleteSiteCard />
    </>
  );
}

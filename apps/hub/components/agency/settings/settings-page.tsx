"use client";

import { OriginsPage } from "@/components/agency/origins-page";
import { DeleteSiteCard } from "@/components/agency/settings/danger-page";
import { useAgencyOptional } from "@/components/agency/use-agency";
import { PageHeader } from "@/components/ds/layout/page-header";
import { siteName } from "@/components/ds/layout/top-bar";
import { EmptyState } from "@/components/ds/ui/misc";
import { Lock } from "@/components/icon";
import { BusinessCard } from "@/components/settings/business-card";
import { GoogleBusinessCard } from "@/components/settings/google-business-card";
import { NotifyEmailCard } from "@/components/settings/notify-email-card";
import { SiteLogoCard } from "@/components/settings/site-logo-card";
import { WebsiteUrlCard } from "@/components/settings/website-url-card";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";

/**
 * Project Settings, owner and admins only: the business details every app
 * reads (name, logo, phone, address, hours, Google listing), the website
 * address, where form submissions are emailed, the domains the embed scripts
 * may run on, and deleting the site.
 */
export function ProjectSettingsPage() {
  const projectId = useProjectId();
  const project = useProject();
  const agency = useAgencyOptional();

  const header = (
    <PageHeader
      title="Settings"
      description="Your business details and logo, your Google listing, where form submissions go, and deleting the site."
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
      <SiteLogoCard name={project?.name || siteName(project?.websiteUrl) || project?.repo || ""} />
      <BusinessCard projectId={projectId} />
      <WebsiteUrlCard projectId={projectId} />
      <GoogleBusinessCard projectId={projectId} />
      <NotifyEmailCard projectId={projectId} />
      {agency && <OriginsPage />}
      <DeleteSiteCard />
    </>
  );
}

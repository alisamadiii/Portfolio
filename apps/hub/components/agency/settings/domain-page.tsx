"use client";

import { useAgencyOptional } from "@/components/agency/use-agency";
import { OriginsPage } from "@/components/agency/origins-page";
import { PageHeader } from "@/components/ds/layout/page-header";
import { NotifyEmailCard } from "@/components/settings/notify-email-card";
import { WebsiteUrlCard } from "@/components/settings/website-url-card";
import { useRouteProjectId } from "@/hooks/use-repo";

/**
 * Domain: the site's address, where submissions are emailed, and (for sites
 * with the lead script) the domains the capture script may run on.
 */
export function AgencyDomainPage() {
  const projectId = useRouteProjectId();
  const agency = useAgencyOptional();
  return (
    <>
      <PageHeader
        title="Domain"
        description="Where your website is hosted, and where its form submissions are sent."
      />
      <WebsiteUrlCard projectId={projectId} />
      <NotifyEmailCard projectId={projectId} />
      {agency && <OriginsPage />}
    </>
  );
}

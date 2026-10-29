"use client";

import { useProject } from "@/hooks/use-project";

import { OriginsPage } from "@/components/agency/origins-page";
import { NotifyEmailCard } from "@/components/settings/notify-email-card";
import { PageShell } from "@/components/agency/page-shell";
import { WebsiteUrlCard } from "@/components/settings/website-url-card";

/**
 * Agency Site settings › Domain: the site's address (shared WebsiteUrlCard)
 * plus the lead form / booking widget allowed origins, in one page.
 */
export function AgencyDomainPage() {
  const repoId = useProject()?.repoId ?? 0;
  return (
    <PageShell
      eyebrow="SITE SETTINGS"
      title="Domain"
      lead="Where your website is hosted, and the sites your lead form and booking widget are allowed to run on."
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
          Website address
        </h2>
        <WebsiteUrlCard repoId={repoId} />
      </section>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
            Allowed origins
          </h2>
          <p className="text-muted-foreground text-[15px]">
            Your form key only works on these domains, so nobody can use it from
            anywhere else.
          </p>
        </div>
        <OriginsPage />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
          Notification email
        </h2>
        <NotifyEmailCard repoId={repoId} />
      </section>
    </PageShell>
  );
}

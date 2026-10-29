"use client";

import { useProject } from "@/hooks/use-project";

import { OriginsCard } from "@/components/settings/origins-card";
import { WebsiteUrlCard } from "@/components/settings/website-url-card";

/** Site Settings › Domain. The live site is hosted elsewhere (the client's own
 * Netlify); this only records its address and the embed-script allowlist. */
export function DomainPanel() {
  const projectId = useProject()?.projectId ?? "";

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight">Domain</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Where the live site is hosted, and which domains may use your lead
          form, booking and contact scripts.
        </p>
      </div>
      <WebsiteUrlCard projectId={projectId} />
      <OriginsCard projectId={projectId} />
    </div>
  );
}

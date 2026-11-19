"use client";

import { AgencySpeedPage } from "@/components/agency/settings/speed-page";
import { DocumentTitle } from "@/components/document-title";
import { ProjectFeatureGate } from "@/components/settings/project-paywall";

export default function SpeedPage() {
  return (
    <>
      <DocumentTitle title="Speed" />
      <ProjectFeatureGate feature="speed">
        <AgencySpeedPage />
      </ProjectFeatureGate>
    </>
  );
}

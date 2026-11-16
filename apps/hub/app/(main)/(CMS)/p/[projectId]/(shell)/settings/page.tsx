"use client";

import { ProjectSettingsPage } from "@/components/agency/settings/settings-page";
import { DocumentTitle } from "@/components/document-title";

export default function SettingsPage() {
  return (
    <>
      <DocumentTitle title="Settings" />
      <ProjectSettingsPage />
    </>
  );
}

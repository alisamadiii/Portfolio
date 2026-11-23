"use client";

import { AutomationsPage } from "@/components/automations/automations-page";
import { DocumentTitle } from "@/components/document-title";

export default function AutomationsRoute() {
  return (
    <>
      <DocumentTitle title="Automations" />
      <AutomationsPage />
    </>
  );
}

"use client";

import { AgencyHome } from "@/components/agency/agency-home";
import { DocumentTitle } from "@/components/document-title";

export default function HomePage() {
  return (
    <>
      <DocumentTitle title="Home" />
      <AgencyHome />
    </>
  );
}

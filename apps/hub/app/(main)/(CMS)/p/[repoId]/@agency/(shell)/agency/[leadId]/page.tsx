"use client";

import { use } from "react";
import { notFound } from "next/navigation";

import { LeadDetail } from "@/components/agency/lead-detail";
import { DocumentTitle } from "@/components/document-title";

export default function LeadPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = use(params);
  const id = Number(leadId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return (
    <>
      <DocumentTitle title="Lead" />
      <LeadDetail id={id} />
    </>
  );
}

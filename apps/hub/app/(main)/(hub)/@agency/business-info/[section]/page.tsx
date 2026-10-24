import { notFound } from "next/navigation";

import { BUSINESS_SECTIONS } from "@/components/agency/business-info-config";
import { BusinessInfoSection } from "@/components/agency/business-info-page";

export default async function AgencyBusinessInfoSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  // "business" lives on the index route, not here.
  const known = BUSINESS_SECTIONS.some(
    (s) => s.key === section && s.key !== "business"
  );
  if (!known) notFound();

  return <BusinessInfoSection sectionKey={section} />;
}

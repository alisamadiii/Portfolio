"use client";

import { notFound, useParams } from "next/navigation";

import {
  siteSetting,
  SiteSettingPage,
} from "@/components/agency/settings/site-settings";
import { DocumentTitle } from "@/components/document-title";

export default function AgencySiteSettingPage() {
  const { section } = useParams<{ section: string }>();
  const setting = siteSetting(section);
  if (!setting) notFound();

  return (
    <>
      <DocumentTitle title={setting.title} />
      <SiteSettingPage section={setting.key} />
    </>
  );
}

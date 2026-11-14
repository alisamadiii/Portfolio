"use client";

import { useParams } from "next/navigation";

import { WebsiteDetail } from "@/components/client-websites/website-detail";

export default function ClientWebsitePage() {
  const { slug } = useParams<{ slug: string }>();
  return <WebsiteDetail slug={decodeURIComponent(slug)} />;
}

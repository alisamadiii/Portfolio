"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";

import { getSchemaByName } from "@/lib/schema";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { MediaView } from "@/components/media/media-view";

export default function Page({
  params,
}: {
  params: Promise<{
    name: string;
  }>;
}) {
  const resolvedParams = use(params);
  const { config } = useConfig();
  if (!config) throw new Error("Configuration not found.");
  const searchParams = useSearchParams();
  const path = searchParams.get("path") || "";
  const schema = getSchemaByName(
    config.object,
    decodeURIComponent(resolvedParams.name),
    "media"
  );
  const displayName =
    schema?.label || schema?.name || decodeURIComponent(resolvedParams.name);

  return (
    <div className="mx-auto flex h-full max-w-screen-xl flex-1 flex-col">
      <DocumentTitle
        title={formatRepoBranchTitle(
          displayName,
          config.owner,
          config.repo,
          config.branch
        )}
      />
      <div className="relative flex flex-1 flex-col">
        <MediaView initialPath={path} media={resolvedParams.name} />
      </div>
    </div>
  );
}

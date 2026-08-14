"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";

import { getSchemaByName } from "@workspace/cms-core/schema";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { Entry } from "@/components/entry/entry";

export default function Page({
  params,
}: {
  params: Promise<{
    owner: string;
    repo: string;
    branch: string;
    name: string;
    path: string;
  }>;
}) {
  const resolvedParams = use(params);
  const { config } = useConfig();
  if (!config) throw new Error("Configuration not found.");
  const searchParams = useSearchParams();
  const parent = searchParams.get("parent") || undefined;
  const schemaName = decodeURIComponent(resolvedParams.name);
  const schema = getSchemaByName(config.object, schemaName);
  const displayName = schema?.label || schema?.name || schemaName;

  // Reorderable collections pass ?order=<max+1> so new entries land at the end.
  const orderParam = searchParams.get("order");
  const orderField = schema?.view?.reorder;
  const initialValues =
    orderField && orderParam !== null && Number.isFinite(Number(orderParam))
      ? { [orderField]: Number(orderParam) }
      : undefined;

  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle(
          `New entry | ${displayName}`,
          config.owner,
          config.repo,
          config.branch
        )}
      />
      <Entry
        name={schemaName}
        title="New entry"
        parent={parent}
        initialValues={initialValues}
      />
    </>
  );
}

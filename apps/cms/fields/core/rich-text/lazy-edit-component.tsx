"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@workspace/ui/components/skeleton";

const EditComponent = dynamic(
  () => import("./edit-component").then((m) => m.EditComponent),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-md" /> }
);

export { EditComponent };

"use client";

import type { UserMetadata } from "@workspace/drizzle/schema";
import { useTRPC } from "@workspace/trpc/client";

import { MetadataEditor } from "@/components/metadata-editor";

export const ClientMetadataEditor = ({
  userId,
  clientId,
  initialMetadata,
}: {
  userId: string;
  clientId: string;
  initialMetadata: UserMetadata;
}) => {
  const trpc = useTRPC();
  return (
    <MetadataEditor
      userId={userId}
      initialMetadata={initialMetadata}
      invalidateQueryKey={trpc.clients.get.queryKey(clientId)}
    />
  );
};

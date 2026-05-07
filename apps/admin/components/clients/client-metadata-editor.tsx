"use client";

import { useTRPC } from "@workspace/trpc/client";

import { MetadataEditor } from "@/components/metadata-editor";

export const ClientMetadataEditor = ({
  userId,
  initialMetadata,
}: {
  userId: string;
  initialMetadata: Record<string, string>;
}) => {
  const trpc = useTRPC();
  return (
    <MetadataEditor
      userId={userId}
      initialMetadata={initialMetadata}
      invalidateQueryKey={trpc.users.getClientDetail.queryKey(userId)}
    />
  );
};

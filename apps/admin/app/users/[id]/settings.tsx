"use client";

import { useParams } from "next/navigation";

import { MediaGallery } from "@/components/users/media-gallery";

export const Settings = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <MediaGallery userId={id} />
    </div>
  );
};

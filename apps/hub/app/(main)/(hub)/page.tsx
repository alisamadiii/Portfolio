"use client";

import { useUser } from "@/contexts/user-context";

import { DocumentTitle } from "@/components/document-title";
import { ProjectGallery } from "@/components/project-gallery";

// ─── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useUser();
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <DocumentTitle title="Home" />
      <div className="max-w-[860px]">
        <h1 className="text-[32px] font-extrabold tracking-tight">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-[15px]">
          Everything about your website, in one place.
        </p>
      </div>

      <ProjectGallery />
    </div>
  );
}

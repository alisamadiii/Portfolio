"use client";

import { DocumentTitle } from "@/components/document-title";
import { MembersPage } from "@/components/members/members-page";

export default function ProjectMembersPage() {
  return (
    <>
      <DocumentTitle title="Members" />
      <MembersPage />
    </>
  );
}

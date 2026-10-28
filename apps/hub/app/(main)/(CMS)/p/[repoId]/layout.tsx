import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { isAdminUser } from "@/lib/authz-shared";
import { getServerSession } from "@/lib/session-server";

import { AgencySeed } from "@/components/query-seeds";
import { ErrorCard } from "@/components/repo/project-snapshot-gate";

// A project has two UIs: the website editor (@website) and, when the project
// runs on an agency subscription, the lead-generation agency workspace
// (@agency). Each slot is a full tree with its own shell and pages; this is
// the only place that decides which one a project gets.
export default async function Layout({
  agency,
  website,
  params,
}: {
  children: React.ReactNode;
  agency: React.ReactNode;
  website: React.ReactNode;
  params: Promise<{ repoId: string }>;
}) {
  const { repoId: repoIdParam } = await params;
  const repoId = Number(repoIdParam);
  if (!Number.isInteger(repoId) || repoId <= 0) {
    return (
      <ErrorCard
        title="Project not found"
        description="This project no longer exists in Client Hub — it may have been removed or renamed."
      />
    );
  }
  const requestHeaders = await headers();
  const session = await getServerSession();
  const returnTo = requestHeaders.get("x-return-to");
  const signInUrl =
    returnTo && returnTo !== "/sign-in"
      ? `/sign-in?redirect=${encodeURIComponent(returnTo)}`
      : "/sign-in";
  if (!session?.user) return redirect(signInUrl);

  // Admins can force the website UI on an agency project (AdminViewSwitch).
  const view = (await cookies()).get(`hub-view-${repoId}`)?.value;
  if (view === "website" && isAdminUser(session.user)) return website;

  const caller = createHttpCaller(requestHeaders);
  const agencyProject = await caller.agency.project.query({ repoId });
  if (!agencyProject) return website;

  return <AgencySeed agency={agencyProject}>{agency}</AgencySeed>;
}

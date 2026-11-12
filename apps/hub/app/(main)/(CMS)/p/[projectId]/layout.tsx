import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { getServerSession } from "@/lib/session-server";

import { AgencySeed, ProjectsSeed } from "@/components/query-seeds";
import { ErrorCard } from "@/components/repo/project-snapshot-gate";
import { isProjectId } from "@/lib/paths";

// One UI for every project. This layout only authenticates and seeds the two
// queries the shell reads on every page: the caller's project list (name,
// url, apps, role: DB-only, so no GitHub dependency) and the project's agency
// data when it has any. The editor route seeds its own GitHub snapshot.
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!isProjectId(projectId)) {
    return (
      <ErrorCard
        title="Project not found"
        description="This project no longer exists in Client Hub. It may have been removed or renamed."
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

  const caller = createHttpCaller(requestHeaders);
  const [projects, agency] = await Promise.all([
    caller.cms.repos.listMine.query(),
    caller.agency.project.query({ projectId }).catch(() => null),
  ]);
  if (!projects.some((p) => p.projectId === projectId)) {
    return (
      <ErrorCard
        title="Project not found"
        description="This project doesn't exist or you don't have access to it."
      />
    );
  }

  return (
    <ProjectsSeed projects={projects}>
      {agency ? <AgencySeed agency={agency}>{children}</AgencySeed> : children}
    </ProjectsSeed>
  );
}

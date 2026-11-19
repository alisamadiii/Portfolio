import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ImpersonationBanner } from "@workspace/auth/components/impersonation-banner";

import { SubscriptionGateProvider } from "@/components/subscription/subscription-gate";
import { ConnectErrorToast } from "@/components/connect-error-toast";
import { AgencySeed, ProjectsSeed, SessionSeed } from "@/components/query-seeds";
import { WorkspaceProvider } from "@/components/workspace-provider";

import { createHttpCaller } from "@workspace/trpc/http-caller";
import { getServerProjects, getServerSession, getWorkspaceProject } from "@/lib/session-server";

// One workspace at a time: the project the hub is focused on comes from the
// hub-project cookie (else the caller's first project) and is resolved here,
// once per request, for every page under (main). Pages never carry it in
// the URL; switching goes through the selectProject action.
export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const session = await getServerSession();
  const returnTo = requestHeaders.get("x-return-to");
  const signInUrl =
    returnTo && returnTo !== "/sign-in"
      ? `/sign-in?redirect=${encodeURIComponent(returnTo)}`
      : "/sign-in";
  if (!session?.user) return redirect(signInUrl);

  const caller = createHttpCaller(requestHeaders);

  // Auth lives in the shared portal package, so the invite binding that used
  // to run in Better Auth's session-create hook happens here on CMS entry.
  // It must finish before the project list loads: a fresh invitee's project
  // is only visible once the invite is bound.
  await caller.cms.collaborators.bindInvites.mutate().catch(() => {});

  const [current, projects, project] = await Promise.all([
    caller.users.getCurrent.query(),
    getServerProjects(),
    getWorkspaceProject(),
  ]);
  const agency = project
    ? await caller.agency.project.query({ projectId: project.projectId }).catch(() => null)
    : null;

  const content = (
    <SubscriptionGateProvider>
      <ImpersonationBanner />
      <ConnectErrorToast />
      {children}
    </SubscriptionGateProvider>
  );

  return (
    <SessionSeed current={current}>
      <ProjectsSeed projects={projects}>
        <WorkspaceProvider projectId={project?.projectId ?? ""}>
          {agency ? <AgencySeed agency={agency}>{content}</AgencySeed> : content}
        </WorkspaceProvider>
      </ProjectsSeed>
    </SessionSeed>
  );
}

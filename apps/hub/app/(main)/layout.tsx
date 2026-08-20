import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ImpersonationBanner } from "@workspace/auth/components/impersonation-banner";
import { SessionRefreshProvider } from "@workspace/auth/providers/session-refresh-provider";

import { SubscriptionGateProvider } from "@/components/subscription/subscription-gate";
import { UserProvider } from "@/contexts/user-context";

import { createHttpCaller } from "@workspace/trpc/http-caller";
import { bindCollaboratorInvitesToUser } from "@workspace/trpc/lib/cms/collaborator-access";
import { isAdminUser } from "@/lib/authz-shared";
import { getServerSession } from "@/lib/session-server";

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

  // Auth lives in the shared portal package, so the invite binding that used
  // to run in Better Auth's session-create hook happens here on CMS entry.
  await bindCollaboratorInvitesToUser(session.user).catch(() => {});

  const accounts = await createHttpCaller(
    requestHeaders
  ).cms.repos.listAccounts.query();

  const userWithAccounts = {
    ...session.user,
    isAdmin: isAdminUser(session.user),
    accounts,
  };

  return (
    <UserProvider user={userWithAccounts}>
      <SubscriptionGateProvider>
        <SessionRefreshProvider>
          <ImpersonationBanner />
          {children}
        </SessionRefreshProvider>
      </SubscriptionGateProvider>
    </UserProvider>
  );
}

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAccounts } from "@/lib/accounts";
import { UserProvider } from "@/contexts/user-context";
import { User } from "@/types/user";
import { getServerSession } from "@/lib/session-server";
import { GithubAuthExpired } from "@/components/github-auth-expired";
import { isGithubAuthError } from "@/lib/github-auth";
import { invalidateSessionForGithubAuthError } from "@/lib/github-auth-server";
import { hasAdminAccess } from "@/lib/admin";
import { syncGithubProfileOnLogin } from "@/lib/github-account";
import { bindCollaboratorInvitesToUser } from "@/lib/collaborator-access";

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

  // Auth lives in the shared portal package, so the side-effects that used to
  // run in Better Auth's session-create hook happen here on CMS entry instead.
  // The GitHub profile sync is gated on the username still being unset — it
  // calls the GitHub API, which is too expensive to repeat on every render.
  const sessionUser = session.user as User;
  await Promise.all([
    sessionUser.githubUsername
      ? Promise.resolve()
      : syncGithubProfileOnLogin(sessionUser.id).catch(() => {}),
    bindCollaboratorInvitesToUser(sessionUser).catch(() => {}),
  ]);

  let accounts;
  try {
    accounts = await getAccounts(session.user as User);
  } catch (error) {
    if (isGithubAuthError(error)) {
      await invalidateSessionForGithubAuthError(session);
      return <GithubAuthExpired />;
    }
    throw error;
  }

  const userWithAccounts = {
    ...session.user,
    isAdmin: hasAdminAccess(session.user as User),
    accounts,
  };
  
	return (
    <UserProvider user={userWithAccounts}>
      {children}
    </UserProvider>
  );
}

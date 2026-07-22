import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAccounts } from "@/lib/accounts";
import { UserProvider } from "@/contexts/user-context";
import { User } from "@/types/user";
import { getServerSession } from "@/lib/session-server";
import { hasAdminAccess } from "@/lib/admin";
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

  // Auth lives in the shared portal package, so the invite binding that used
  // to run in Better Auth's session-create hook happens here on CMS entry.
  const sessionUser = session.user as User;
  await bindCollaboratorInvitesToUser(sessionUser).catch(() => {});

  const accounts = await getAccounts(sessionUser);

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

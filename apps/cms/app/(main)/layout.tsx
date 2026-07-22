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

  // TEMP DEBUG: surface the auth failure instead of bouncing to the portal.
  let session: Awaited<ReturnType<typeof getServerSession>> = null;
  let sessionError: string | null = null;
  try {
    session = await getServerSession();
  } catch (error: any) {
    sessionError = error?.message ?? String(error);
  }

  if (!session?.user) {
    const cookieNames = (requestHeaders.get("cookie") ?? "")
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter(Boolean);

    return (
      <div className="mx-auto max-w-screen-sm p-8 space-y-4 font-mono text-sm">
        <h1 className="text-lg font-semibold">Auth debug — no session</h1>
        <p>getSession error: {sessionError ?? "none (returned null)"}</p>
        <p>cookies received: {cookieNames.length ? cookieNames.join(", ") : "NONE"}</p>
        <p>
          env: secret={String(Boolean(process.env.BETTER_AUTH_SECRET))}{" "}
          db={String(Boolean(process.env.DATABASE_URL))}{" "}
          node_env={process.env.NODE_ENV}
        </p>
        <p>
          More detail: <a className="underline" href="/api/debug-auth">/api/debug-auth</a>
        </p>
        <p>
          <a className="underline" href="/sign-in">Go to sign-in</a>
        </p>
      </div>
    );
  }

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

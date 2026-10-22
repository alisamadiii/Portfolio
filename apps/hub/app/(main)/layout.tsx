import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ImpersonationBanner } from "@workspace/auth/components/impersonation-banner";

import { SubscriptionGateProvider } from "@/components/subscription/subscription-gate";
import { SessionSeed } from "@/components/query-seeds";

import { createHttpCaller } from "@workspace/trpc/http-caller";
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

  const caller = createHttpCaller(requestHeaders);

  // Auth lives in the shared portal package, so the invite binding that used
  // to run in Better Auth's session-create hook happens here on CMS entry.
  // DB access lives in the portfolio backend, so this goes over tRPC.
  await caller.cms.collaborators.bindInvites.mutate().catch(() => {});

  const current = await caller.users.getCurrent.query();

  return (
    <SessionSeed current={current}>
      <SubscriptionGateProvider>
        <ImpersonationBanner />
        {children}
      </SubscriptionGateProvider>
    </SessionSeed>
  );
}

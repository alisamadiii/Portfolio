import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RepoProvider } from "@/contexts/repo-context";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { createHttpCaller } from "@workspace/trpc/http-caller";
import { getServerSession } from "@/lib/session-server";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const requestHeaders = await headers();
  const session = await getServerSession();
  const user = session?.user;
  const returnTo = requestHeaders.get("x-return-to");
  const signInUrl =
    returnTo && returnTo !== "/sign-in"
      ? `/sign-in?redirect=${encodeURIComponent(returnTo)}`
      : "/sign-in";
  if (!user) return redirect(signInUrl);

  try {
    const caller = createHttpCaller(requestHeaders);
    const repoInfo = await caller.cms.repos.getSnapshot.query({ owner, repo });
    const branchNames = repoInfo.branches ?? [];

    if (branchNames.length === 0) {
      return (
        <Empty className="absolute inset-0 rounded-none border-0">
          <EmptyHeader>
            <EmptyTitle>Empty repository</EmptyTitle>
            <EmptyDescription>
              Create a branch and add a &quot;.pages.yml&quot; file to configure
              this repository.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="default"
              render={<Link href="/">Choose another repository</Link>}
            />
          </EmptyContent>
        </Empty>
      );
    }

    return <RepoProvider repo={repoInfo}>{children}</RepoProvider>;
  } catch (error: any) {
    // tRPC surfaces engine HttpErrors as TRPCClientError with `data.code`
    // (404 → NOT_FOUND, 403 → FORBIDDEN). Anything else — including
    // UNAUTHORIZED (missing token, previously a plain rethrown Error) —
    // rethrows to the error boundary, same as before.
    switch (error?.data?.code) {
      case "NOT_FOUND":
        // TODO: adjust as it may be the permissions as insufficient (suggest installing the app)
        return (
          <Empty className="absolute inset-0 rounded-none border-0">
            <EmptyHeader>
              <EmptyTitle>Repository not found</EmptyTitle>
              <EmptyDescription>
                It may have been removed, renamed, or the URL may be incorrect.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="default"
                render={<Link href="/">Choose another repository</Link>}
              />
            </EmptyContent>
          </Empty>
        );
      case "FORBIDDEN":
        return (
          <Empty className="absolute inset-0 rounded-none border-0">
            <EmptyHeader>
              <EmptyTitle>Access denied</EmptyTitle>
              <EmptyDescription>
                You do not have permission to access this repository.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="default"
                render={<Link href="/">Choose another repository</Link>}
              />
            </EmptyContent>
          </Empty>
        );
      default:
        throw error;
    }
  }
}

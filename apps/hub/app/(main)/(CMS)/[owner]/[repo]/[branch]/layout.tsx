import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigProvider } from "@/contexts/config-context";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { getConfig } from "@/lib/config-store";
import { getServerSession } from "@/lib/session-server";
import { getToken } from "@/lib/token";

import { RepoLayout } from "@/components/repo/repo-layout";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string; branch: string }>;
}) {
  const { owner, repo, branch } = await params;
  const requestHeaders = await headers();
  const session = await getServerSession();
  const user = session?.user;
  const returnTo = requestHeaders.get("x-return-to");
  const signInUrl =
    returnTo && returnTo !== "/sign-in"
      ? `/sign-in?redirect=${encodeURIComponent(returnTo)}`
      : "/sign-in";
  if (!user) return redirect(signInUrl);

  const decodedBranch = decodeURIComponent(branch);

  let config = {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    branch: decodedBranch,
    sha: "",
    version: "",
    object: {},
  };

  let errorMessage = null;

  try {
    const { token } = await getToken(user, owner, repo);
    const syncedConfig = await getConfig(owner, repo, decodedBranch, {
      getToken: async () => token,
    });

    if (syncedConfig) {
      config = syncedConfig;
    }
  } catch (error: any) {
    if (error.status === 404) {
      if (error.response?.data?.message === "Not Found") {
        // Let downstream pages (especially /configuration via Entry) handle missing .pages.yml.
      } else {
        // We assume the branch is not valid
        errorMessage = (
          <Empty className="absolute inset-0 rounded-none border-0">
            <EmptyHeader>
              <EmptyTitle>Branch not found</EmptyTitle>
              <EmptyDescription>{`The branch "${decodedBranch}" could not be found. It may have been removed or renamed.`}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="default"
                render={
                  <Link href={`/${owner}/${repo}`}>Open default branch</Link>
                }
              />
            </EmptyContent>
          </Empty>
        );
      }
    } else if (error.status === 403) {
      errorMessage = (
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
    } else {
      throw error;
    }
  }

  return (
    <ConfigProvider value={config}>
      <RepoLayout>{errorMessage ? errorMessage : children}</RepoLayout>
    </ConfigProvider>
  );
}

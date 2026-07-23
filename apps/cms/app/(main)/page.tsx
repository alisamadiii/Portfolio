"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/user-context";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { getVisits } from "@/lib/tracker";

import { DocumentTitle } from "@/components/document-title";
import { RepoLatest } from "@/components/repo/repo-latest";
import { RepoSelect } from "@/components/repo/repo-select";

import { MainRootLayout } from "./main-root-layout";

export default function Page() {
  const [hasRecentVisits, setHasRecentVisits] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setHasRecentVisits(getVisits().length > 0);
  }, []);

  if (!user) throw new Error("User not found");
  if (!user.accounts) throw new Error("Accounts not found");

  return (
    <MainRootLayout>
      <DocumentTitle title="Projects" />
      <div className="mx-auto max-w-screen-sm space-y-8 p-4 md:p-6">
        {user.accounts.length > 0 ? (
          <div className="flex min-h-[calc(100vh-12rem)] flex-col justify-center space-y-8">
            {hasRecentVisits && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium tracking-tight">
                  Recently visited
                </h2>
                <RepoLatest />
              </div>
            )}
            <div className="space-y-4">
              <h2 className="text-lg font-medium tracking-tight">
                Open a project
              </h2>
              <RepoSelect />
            </div>
          </div>
        ) : (
          <Empty className="absolute inset-0 rounded-none border-0">
            <EmptyHeader>
              <EmptyTitle>No repositories yet</EmptyTitle>
              <EmptyDescription>
                You need an invitation to a repository before you can
                collaborate. Ask an admin to invite you.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </MainRootLayout>
  );
}

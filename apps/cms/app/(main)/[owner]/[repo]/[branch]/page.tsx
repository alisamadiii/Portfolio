"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";

import { buttonVariants } from "@workspace/ui/components/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { isAdminUser } from "@/lib/authz-shared";
import { isConfigEnabled } from "@/lib/config";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (config?.object.content?.[0]) {
      router.replace(
        `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${config.object.content[0].type}/${config.object.content[0].name}`
      );
    } else if (config?.object.media) {
      router.replace(
        `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/media/${config.object.media[0].name}`
      );
    } else if (isAdminUser(user) && isConfigEnabled(config?.object)) {
      router.replace(
        `/${config?.owner}/${config?.repo}/${encodeURIComponent(config!.branch)}/configuration`
      );
    } else {
      setError(true);
    }
  }, [config, router, user]);

  return error ? (
    isAdminUser(user) ? (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Configuration unavailable</EmptyTitle>
          <EmptyDescription>
            This repository is not configured, and configuration access is
            disabled here. Edit &quot;.pages.yml&quot; on GitHub if you think
            this is a mistake.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            className={buttonVariants({ variant: "default" })}
            href={`https://github.com/${config?.owner}/${config?.repo}/edit/${encodeURIComponent(config!.branch)}/.pages.yml`}
          >
            Edit configuration on GitHub
          </Link>
        </EmptyContent>
      </Empty>
    ) : (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Repository not configured</EmptyTitle>
          <EmptyDescription>
            This repository does not have a &quot;.pages.yml&quot; file yet. Ask
            a GitHub admin to initialize the configuration first.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  ) : null;
}

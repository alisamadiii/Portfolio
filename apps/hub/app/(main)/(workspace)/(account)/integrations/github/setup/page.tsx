"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

import { DocumentTitle } from "@/components/document-title";
import { CircleCheck, X } from "@/components/icon";

/**
 * GitHub's post-install redirect ("Setup URL" of the GitHub App). Claims the
 * installation for the signed-in hub user, then sends them back to
 * Integrations (or straight to importing).
 */
function SetupInner() {
  const params = useSearchParams();
  const router = useRouter();
  const trpc = useTRPC();
  const installationId = Number(params.get("installation_id"));
  const fired = useRef(false);

  const link = useMutation(
    trpc.deploy.linkInstallation.mutationOptions({
      onSuccess: (data) => {
        toast.success(`GitHub App linked for ${data.accountLogin}.`);
        router.replace("/integrations");
      },
    })
  );

  useEffect(() => {
    if (fired.current) return;
    if (Number.isInteger(installationId) && installationId > 0) {
      fired.current = true;
      link.mutate({ installationId });
    }
  }, [installationId, link]);

  if (!Number.isInteger(installationId) || installationId <= 0) {
    return (
      <StatusCard
        tone="error"
        title="Missing installation"
        description="This page is opened by GitHub after installing the app. Start the install from Integrations."
      />
    );
  }

  if (link.isError) {
    return (
      <StatusCard
        tone="error"
        title="Could not link the installation"
        description={link.error.message}
        action={
          <Button onClick={() => link.mutate({ installationId })}>
            Try again
          </Button>
        }
      />
    );
  }

  if (link.isSuccess) {
    return (
      <StatusCard
        tone="success"
        title="GitHub App linked"
        description="Taking you back to Integrations…"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Spinner className="text-muted-foreground size-6" />
      <p className="text-muted-foreground text-[14px]">
        Linking your GitHub App installation…
      </p>
    </div>
  );
}

const StatusCard = ({
  tone,
  title,
  description,
  action,
}: {
  tone: "success" | "error";
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border p-7">
    <div
      className={
        tone === "success"
          ? "bg-status-success-bg text-status-success flex size-11 items-center justify-center rounded-xl"
          : "bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-xl"
      }
    >
      {tone === "success" ? (
        <CircleCheck className="size-5" />
      ) : (
        <X className="size-5" />
      )}
    </div>
    <h1 className="mt-4 text-[19px] font-semibold tracking-tight">{title}</h1>
    <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
      {description}
    </p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default function GithubSetupPage() {
  return (
    <>
      <DocumentTitle title="GitHub App" />
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <Spinner className="text-muted-foreground size-6" />
          </div>
        }
      >
        <SetupInner />
      </Suspense>
    </>
  );
}

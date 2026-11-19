"use client";

import { GitBranch, Plus } from "lucide-react";

import { DeployButton } from "@/components/deploy/deploy-dialog";
import { Button, ButtonLink } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { IconTile } from "@/components/ds/ui/misc";

/** Shown instead of project pages until the account has a site. */
export function WelcomeCard() {
  return (
    <Card className="flex gap-4 border-coral p-6 shadow-[0_0_0_3px_var(--color-coral-soft)]">
      <IconTile size={48}>
        <Plus className="size-5" strokeWidth={1.8} />
      </IconTile>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Import your first site</h2>
          <p className="max-w-[560px] text-sm leading-relaxed text-dim">
            Connect a GitHub repository or upload a folder. Your site then gets its own Home,
            editor and apps right here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeployButton
            trigger={(open) => (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={open}>
                Import site
              </Button>
            )}
          />
          <ButtonLink href="/integrations" icon={<GitBranch className="size-4" />}>
            GitHub access
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

"use client";

import { Mail, Sparkles, Upload, Users } from "lucide-react";

import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { PageHeader } from "@/components/ds/layout/page-header";
import { buttonClass } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { EmptyState, IconTile, KpiGrid } from "@/components/ds/ui/misc";

/**
 * Newsletter app. There is no campaign or subscriber data in the hub yet (the
 * emails router is a sent log), so every number is "—" and every action asks
 * us to set it up. Never invent metrics.
 */
export function NewsletterPage() {
  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Email your customers from your own list, with your branding."
        actions={
          <>
            <RequestDialog defaultSubject="Newsletter: import subscribers">
              <span className={buttonClass("outline")}>
                <Upload className="size-[15px]" />
                Import subscribers
              </span>
            </RequestDialog>
            <RequestDialog defaultSubject="Newsletter: new campaign">
              <span className={buttonClass("primary")}>New campaign</span>
            </RequestDialog>
          </>
        }
      />
      <KpiGrid
        items={[
          { label: "Subscribers", value: "—" },
          { label: "Campaigns sent", value: "—" },
          { label: "Open rate", value: "—" },
          { label: "Click rate", value: "—" },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Campaigns" divided />
          <EmptyState
            icon={<Mail className="size-5" />}
            title="No campaigns yet"
            text="Write your first email, like a seasonal offer or news about your business, and send it to your list."
            action={
              <RequestDialog defaultSubject="Newsletter: new campaign">
                <span className={buttonClass("primary", "sm")}>New campaign</span>
              </RequestDialog>
            }
          />
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <IconTile>
            <Users className="size-5" strokeWidth={1.8} />
          </IconTile>
          <h2 className="text-base font-semibold">Grow your list</h2>
          <p className="text-[13px] leading-normal text-dim">
            Add a signup form to your website so visitors can join your list. Ask the AI editor to
            place it for you.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <RequestDialog defaultSubject="Newsletter: add signup form">
              <span className={buttonClass("outline", "sm")}>
                <Sparkles className="size-3.5 text-coral" />
                Add signup form
              </span>
            </RequestDialog>
            <RequestDialog defaultSubject="Newsletter: import a list">
              <span className={buttonClass("outline", "sm")}>Import a list</span>
            </RequestDialog>
          </div>
        </Card>
      </div>
    </>
  );
}

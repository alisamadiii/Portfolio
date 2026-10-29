"use client";

import { buttonVariants } from "@workspace/ui/components/button";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn } from "@workspace/ui/lib/utils";

import { PageShell } from "@/components/agency/page-shell";
import { DocumentTitle } from "@/components/document-title";
import { Mail } from "@/components/icon";

export default function NewsletterPage() {
  return (
    <>
      <DocumentTitle title="Newsletter" />
      <PageShell
        eyebrow="AGENCY"
        title="Newsletter"
        lead="Turn past leads and customers into repeat business."
      >
        <div className="ring-foreground/10 ring-dashed rounded-[18px] px-6 py-14 text-center ring-1">
          <span className="bg-primary/16 mx-auto flex size-12 items-center justify-center rounded-full text-[#c2451f]">
            <Mail className="size-6" />
          </span>
          <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">
            Newsletter isn&apos;t set up yet
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[15px]">
            We can send a monthly email to your leads and customers. Ask us to
            turn it on.
          </p>
          <div className="mt-5">
            <RequestDialog defaultSubject="Newsletter">
              <span className={cn(buttonVariants())}>
                Ask about newsletters
              </span>
            </RequestDialog>
          </div>
        </div>
      </PageShell>
    </>
  );
}

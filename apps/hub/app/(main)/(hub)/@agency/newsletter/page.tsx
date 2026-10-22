"use client";

import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { DocumentTitle } from "@/components/document-title";
import { Mail } from "@/components/icon";

export default function NewsletterPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Newsletter" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Newsletter</h2>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          Turn past leads and customers into repeat business.
        </p>
      </div>
      <div className="rounded-lg border border-dashed px-6 py-14 text-center">
        <Mail className="text-muted-foreground mx-auto size-8" />
        <h3 className="mt-3 text-[18px] font-extrabold tracking-tight">
          Newsletter isn&apos;t set up yet
        </h3>
        <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
          We can send a monthly email to your leads and customers. Ask us to
          turn it on.
        </p>
        <div className="mt-5">
          <RequestDialog defaultSubject="Newsletter">
            <span className={cn(buttonVariants())}>Ask about newsletters</span>
          </RequestDialog>
        </div>
      </div>
    </div>
  );
}

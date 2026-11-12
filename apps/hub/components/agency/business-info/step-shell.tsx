"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import {
  BUSINESS_STEPS,
  businessInfoUrl,
  sectionUrl,
  stepFor,
} from "@/components/agency/business-info-config";
import { stepStatuses } from "@/components/agency/business-info/status";
import { useAgency } from "@/components/agency/use-agency";
import { StepFooter } from "@/components/ds/business-info/form-parts";
import { StepPills } from "@/components/ds/business-info/step-pills";
import { WithSide } from "@/components/ds/layout/app-shell";
import { PageHeader } from "@/components/ds/layout/page-header";
import { ButtonLink } from "@/components/ds/ui/button";
import { useRouteProjectId } from "@/hooks/use-repo";

function savedLabel(savedAt: Date): string {
  const minutes = Math.floor((Date.now() - savedAt.getTime()) / 60000);
  if (minutes < 1) return "Saved just now";
  return `Saved ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
}

/**
 * Shared frame for the seven step pages: back link, step pills with live
 * done states, eyebrow + title, form | side columns, footer with save actions.
 */
export function StepShell({
  stepKey,
  headerAside,
  aside,
  footer,
  children,
}: {
  stepKey: string;
  /** Rendered on the header's right (step 7's keyword group select). */
  headerAside?: React.ReactNode;
  aside: React.ReactNode;
  /** Omitted = navigation-only footer (no save actions). */
  footer?: {
    dirty: boolean;
    saving: boolean;
    savedAt: Date | null;
    /** Save, then navigate (undefined target = stay). */
    saveAnd: (to?: string) => void;
  };
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const { projectId: agencyProjectId, role } = useAgency();
  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId: agencyProjectId }));
  const campaigns = useQuery(trpc.agency.campaigns.list.queryOptions({ projectId: agencyProjectId }));
  const statuses = stepStatuses(info.data ?? {}, campaigns.data ?? []);
  const done = BUSINESS_STEPS.filter((s) => statuses.get(s.step)?.state === "done").map((s) => s.step);

  const step = stepFor(stepKey)!;
  const index = BUSINESS_STEPS.findIndex((s) => s.key === stepKey);
  const prev = BUSINESS_STEPS[index - 1];
  const next = BUSINESS_STEPS[index + 1];
  const last = !next;
  const overview = businessInfoUrl(projectId);
  const readOnly = role === "view-only";

  return (
    <>
      <div className="flex flex-col gap-4">
        <Link
          href={overview}
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-3 hover:text-ink"
        >
          <ChevronLeft className="size-3.5" /> Business info
        </Link>
        <StepPills base={businessInfoUrl(projectId)} current={step.step} done={done} />
      </div>

      <PageHeader
        eyebrow={`Step ${step.step} of ${BUSINESS_STEPS.length} · ${step.part}`}
        title={step.title}
        description={step.lead}
        actions={headerAside}
      />

      <WithSide side={aside}>
        {children}
        {footer ? (
          <div className="flex flex-col gap-2">
            {footer.savedAt && (
              <span className="inline-flex items-center gap-1.5 self-end text-[13px] text-success-text">
                <Check className="size-3.5" /> {savedLabel(footer.savedAt)}
              </span>
            )}
            <StepFooter
              backHref={prev ? sectionUrl(projectId, prev.key) : overview}
              backLabel={prev ? prev.title : "Overview"}
              nextLabel={footer.saving ? "Saving…" : last ? "Save ad text" : "Save and continue"}
              saving={footer.saving}
              readOnly={readOnly}
              onSaveExit={() => footer.saveAnd(overview)}
              onNext={() => footer.saveAnd(last ? overview : sectionUrl(projectId, next.key))}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <Link
              href={prev ? sectionUrl(projectId, prev.key) : overview}
              className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3"
            >
              <ChevronLeft className="size-3.5" />
              {prev ? prev.title : "Overview"}
            </Link>
            {next && (
              <ButtonLink variant="primary" href={sectionUrl(projectId, next.key)}>
                Continue to {next.title.toLowerCase()}
              </ButtonLink>
            )}
          </div>
        )}
      </WithSide>
    </>
  );
}

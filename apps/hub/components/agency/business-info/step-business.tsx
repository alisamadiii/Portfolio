"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { StepShell } from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { NumberedList } from "@/components/ds/business-info/form-parts";
import { TipCard, UsedIn } from "@/components/ds/business-info/side-cards";
import { Card } from "@/components/ds/ui/card";
import { Field, Input, Textarea } from "@/components/ds/ui/field";

const KEYS = [
  { key: "website", initial: 1 },
  { key: "productDescription", initial: 1 },
  { key: "features", initial: 4 },
  { key: "goal", initial: 1 },
];

const USED_IN = [
  "The audience prompt in step 2",
  "Your tagline options in step 4",
  "Every search ad in step 7",
];

export function StepBusiness() {
  const bi = useBusinessInfo(KEYS);
  const description = bi.draft.productDescription?.[0] ?? "";
  const features = bi.draft.features ?? [];

  return (
    <StepShell
      stepKey="business"
      footer={{ dirty: bi.dirty, saving: bi.saving, savedAt: bi.savedAt, saveAnd: bi.saveAnd }}
      aside={
        <>
          <TipCard
            title="Specific beats clever"
            bad="We help businesses grow online."
            good="We run Google Ads for local service businesses and build the site that turns those clicks into booked jobs."
          />
          <UsedIn items={USED_IN} />
        </>
      }
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : (
        <Card className="flex flex-col gap-6 p-6">
          <Field label="Business name" hint="The name customers know you by.">
            <Input
              value={bi.draft.website?.[0] ?? ""}
              onChange={(e) => bi.setRow("website", 0, e.target.value)}
            />
          </Field>

          <Field
            label="What you sell"
            hint="One or two sentences, the way you'd say it to a customer at the counter."
          >
            <Textarea
              rows={3}
              value={description}
              placeholder="e.g. We run the Google Ads that bring in customers and build the website that turns them into booked jobs."
              onChange={(e) => bi.setRow("productDescription", 0, e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Features and benefits</span>
            <span className="text-[13px] text-dim">
              One per line. Aim for 4 to 6, these become your ad callouts.
            </span>
            <div className="mt-1">
              <NumberedList
                values={features}
                placeholder="e.g. Newsletter platform to email your customers"
                addLabel="Add feature"
                onChange={(next) => bi.setDraft({ ...bi.draft, features: next })}
              />
            </div>
          </div>

          <Field
            label="Main goal"
            optional
            hint="What should the website and ads achieve in the next 3 months?"
          >
            <Input
              value={bi.draft.goal?.[0] ?? ""}
              placeholder="e.g. 20 qualified leads a month from Google"
              onChange={(e) => bi.setRow("goal", 0, e.target.value)}
            />
          </Field>
        </Card>
      )}
    </StepShell>
  );
}

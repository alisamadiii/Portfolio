"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  Eyebrow,
  FieldHead,
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { Check, Plus, Sparkles, X } from "@/components/icon";

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
      footer={{
        dirty: bi.dirty,
        saving: bi.saving,
        savedAt: bi.savedAt,
        saveAnd: bi.saveAnd,
      }}
      aside={
        <>
          <div className="bg-foreground/3 ring-foreground/7 flex flex-col gap-4 rounded-[18px] p-6 ring-1">
            <Eyebrow>Tip</Eyebrow>
            <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
              Specific beats clever
            </h2>
            <div className="flex flex-col gap-1.5 rounded-[11px] bg-[#f8e6e7] p-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.08em] text-[#a3283a] uppercase">
                <X className="size-3.5" /> Too vague
              </span>
              <span className="text-foreground text-[16px] leading-normal">
                "We help businesses grow online."
              </span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-[11px] bg-[#e6efe4] p-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.08em] text-[#2f6b3f] uppercase">
                <Check className="size-3.5" /> Clear
              </span>
              <span className="text-foreground text-[16px] leading-normal">
                "We run Google Ads for local service businesses and build the
                site that turns those clicks into booked jobs."
              </span>
            </div>
          </div>
          <div className="ring-foreground/7 flex flex-col gap-3.5 rounded-[18px] p-6 ring-1">
            <h2 className="text-[18px] font-semibold">This answer is used in</h2>
            <ul className="text-muted-foreground flex flex-col gap-2.5 text-[16px]">
              {USED_IN.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Sparkles aria-hidden className="text-foreground size-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      }
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : (
        <FrameCard innerClassName="flex flex-col gap-8 p-8">
          <div className="flex flex-col gap-2">
            <FieldHead
              htmlFor="bizname"
              label="Business name"
              hint="The name customers know you by."
            />
            <Input
              id="bizname"
              value={bi.draft.website?.[0] ?? ""}
              className="h-auto px-4 py-3.5 text-[17px]"
              onChange={(e) => bi.setRow("website", 0, e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldHead
              htmlFor="desc"
              label="What you sell"
              hint="One or two sentences, the way you'd say it to a customer at the counter."
            />
            <Textarea
              id="desc"
              rows={3}
              value={description}
              placeholder="e.g. We run the Google Ads that bring in customers and build the website that turns them into booked jobs."
              className="px-4 py-3.5 text-[17px] leading-relaxed"
              onChange={(e) => bi.setRow("productDescription", 0, e.target.value)}
            />
            {description && (
              <span className="text-muted-foreground self-end font-mono text-[13px]">
                {description.length} characters
              </span>
            )}
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-[17px] font-semibold">
              Features and benefits
            </legend>
            <span className="text-muted-foreground text-[15px]">
              One per line. Aim for 4 to 6, these become your ad callouts.
            </span>
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-muted-foreground w-7 shrink-0 font-mono text-[14px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Input
                  aria-label={`Feature ${i + 1}`}
                  value={feature}
                  placeholder="e.g. Newsletter platform to email your customers"
                  className="h-auto flex-1 px-4 py-3 text-[17px]"
                  onChange={(e) => bi.setRow("features", i, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove feature ${i + 1}`}
                  className="size-11 shrink-0"
                  disabled={features.length <= 1}
                  onClick={() => bi.removeRow("features", i)}
                >
                  <X className="size-4.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              className="bg-foreground/5 hover:bg-foreground/8 ml-10 self-start rounded-[11px] px-4 text-[15px]"
              onClick={() => bi.addRow("features")}
            >
              <Plus className="size-4" /> Add feature
            </Button>
          </fieldset>

          <div className="flex flex-col gap-2">
            <FieldHead
              htmlFor="goal"
              label="Main goal"
              optional
              hint="What should the website and ads achieve in the next 3 months?"
            />
            <Input
              id="goal"
              value={bi.draft.goal?.[0] ?? ""}
              placeholder="e.g. 20 qualified leads a month from Google"
              className="h-auto px-4 py-3.5 text-[17px]"
              onChange={(e) => bi.setRow("goal", 0, e.target.value)}
            />
          </div>
        </FrameCard>
      )}
    </StepShell>
  );
}

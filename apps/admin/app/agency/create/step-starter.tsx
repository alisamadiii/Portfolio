import { Check } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { STARTER_PRICE } from "@workspace/ui/lib/agency-utils";

type StepStarterProps = {
  onNext: () => void;
};

const STARTER_FEATURES = [
  "5-page website build",
  "Managed hosting",
  "Domain management",
  "Contact form with email forwarding",
];

export const StepStarter = ({ onNext }: StepStarterProps) => {
  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="bg-muted/30 rounded-xl border p-6">
        <p className="text-muted-foreground text-sm font-medium">Starter</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight">
          ${(STARTER_PRICE / 100).toFixed(0)}
          <span className="text-muted-foreground ml-1 text-base font-normal">
            /mo
          </span>
        </p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {STARTER_FEATURES.map((feature) => (
            <li
              key={feature}
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <Check className="text-primary size-4 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-muted-foreground text-xs">
        Included on every product — cannot be removed.
      </p>

      <Button type="button" onClick={onNext} className="w-full">
        Continue
      </Button>
    </div>
  );
};

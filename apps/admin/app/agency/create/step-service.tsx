import { useState } from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import type { ServiceDefinition } from "@workspace/ui/lib/agency-utils";

type StepServiceProps = {
  service: ServiceDefinition;
  isIncluded: boolean;
  price: number;
  onToggle: (included: boolean) => void;
  onPriceChange: (cents: number) => void;
  onNext: () => void;
};

export const StepService = ({
  service,
  isIncluded,
  price,
  onToggle,
  onPriceChange,
  onNext,
}: StepServiceProps) => {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(
    isIncluded ? "yes" : null
  );

  const handleYes = () => {
    setAnswer("yes");
    onToggle(true);
  };

  const handleNo = () => {
    setAnswer("no");
    onToggle(false);
    onNext();
  };

  const priceDollars = price > 0 ? (price / 100).toFixed(2) : "";

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <Badge variant="secondary" className="w-fit font-normal">
        {service.category}
      </Badge>

      <p className="text-muted-foreground text-sm leading-relaxed">
        {service.description}
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={answer === "yes" ? "default" : "outline"}
          onClick={handleYes}
        >
          Yes, include
        </Button>
        <Button
          type="button"
          size="sm"
          variant={answer === "no" ? "default" : "outline"}
          onClick={handleNo}
        >
          No, skip
        </Button>
      </div>

      {answer === "yes" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={priceDollars}
              onChange={(e) => {
                const cents = Math.round(Number(e.target.value) * 100);
                onPriceChange(cents);
              }}
              className="h-9 w-32"
            />
            <span className="text-muted-foreground text-sm">/ mo</span>
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onPriceChange(service.defaultPrice)}
            className="w-fit"
          >
            ${(service.defaultPrice / 100).toFixed(2)}/mo
          </Button>
        </div>
      )}

      {answer === "yes" && (
        <Button
          type="button"
          onClick={onNext}
          disabled={price <= 0}
          className="w-full"
        >
          Next
        </Button>
      )}
    </div>
  );
};

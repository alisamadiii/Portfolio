"use client";

import { forwardRef } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLInputElement>) => {
    const { field, onChange, ...restProps } = props;
    const isInputReadonly = field?.readonly || !field?.options?.editable;

    const generateNewUUID = () => {
      onChange(crypto.randomUUID());
    };

    return (
      <div className="flex gap-2">
        <Input
          {...restProps}
          ref={ref}
          className="text-base"
          readOnly={isInputReadonly}
        />
        {field?.options?.generate !== false && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateNewUUID}
                    className="shrink-0"
                    disabled={field?.readonly}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>
                <p>Generate new UUID</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }
);

export { EditComponent };

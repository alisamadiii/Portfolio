"use client";

import { forwardRef } from "react";
import { RefreshCcw } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { TextField } from "@/components/ui/form-fields";

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLInputElement>) => {
    const { field, value, onChange, ...restProps } = props;
    const isInputReadonly = field?.readonly || !field?.options?.editable;
    const label =
      field?.label === false ? undefined : field?.label || field?.name;

    const generateNewUUID = () => {
      onChange(crypto.randomUUID());
    };

    return (
      <div className="flex items-center gap-2">
        <TextField
          {...restProps}
          inputRef={ref}
          label={label}
          value={value ?? ""}
          onChange={onChange}
          className="flex-1"
          slotProps={{ input: { readOnly: isInputReadonly } }}
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

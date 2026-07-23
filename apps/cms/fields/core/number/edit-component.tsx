"use client";

import { forwardRef } from "react";

import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLInputElement>) => {
    const { field, value, onChange, ...restProps } = props;

    return (
      <Input
        {...restProps}
        ref={ref}
        type="number"
        min={field?.options?.min ?? undefined}
        max={field?.options?.max ?? undefined}
        step={field?.options?.step ?? undefined}
        value={value}
        onChange={onChange}
        className={cn(
          "text-base",
          field?.readonly && "focus-visible:border-input focus-visible:ring-0"
        )}
        readOnly={field?.readonly}
      />
    );
  }
);

export { EditComponent };

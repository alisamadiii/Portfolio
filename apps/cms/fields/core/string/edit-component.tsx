"use client";

import { forwardRef } from "react";

import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLTextAreaElement>) => {
    const { field, ...restProps } = props;
    return (
      <Input
        {...restProps}
        ref={ref}
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

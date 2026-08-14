"use client";

import { forwardRef, type ComponentType } from "react";
import { Link2, Mail, Phone } from "lucide-react";

import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { cn } from "@workspace/ui/lib/utils";

const typeIcons: Record<string, ComponentType> = {
  url: Link2,
  email: Mail,
  tel: Phone,
};

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLTextAreaElement>) => {
    const { field, ...restProps } = props;
    const Icon =
      typeof field?.options?.type === "string"
        ? typeIcons[field.options.type]
        : undefined;

    const inputClassName = cn(
      "text-base bg-background",
      field?.readonly && "focus-visible:border-input focus-visible:ring-0"
    );

    if (Icon) {
      return (
        <InputGroup
          className={cn(
            "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3",
            field?.readonly &&
              "focus-within:border-input focus-within:ring-0"
          )}
        >
          <InputGroupAddon>
            <Icon />
          </InputGroupAddon>
          <InputGroupInput
            {...restProps}
            ref={ref}
            className="text-base"
            readOnly={field?.readonly}
          />
        </InputGroup>
      );
    }

    return (
      <Input
        {...restProps}
        ref={ref}
        className={inputClassName}
        readOnly={field?.readonly}
      />
    );
  }
);

EditComponent.displayName = "EditComponent";

export { EditComponent };

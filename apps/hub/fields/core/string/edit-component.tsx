"use client";

import { forwardRef, type ComponentType } from "react";
import InputAdornment from "@mui/material/InputAdornment";
import { Link2, Mail, Phone } from "lucide-react";

import { TextField } from "@/components/ui/mui";

const typeIcons: Record<string, ComponentType<{ className?: string }>> = {
  url: Link2,
  email: Mail,
  tel: Phone,
};

/**
 * String field — Google/Material outlined field. The label floats from the
 * schema's `field.label`; entry-form suppresses its own FormLabel for this type
 * so there's no duplicate. url/email/tel render a leading icon adornment.
 */
const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLInputElement>) => {
    const { field, value, ...restProps } = props;
    const label =
      field?.label === false ? undefined : field?.label || field?.name;
    const optionType =
      typeof field?.options?.type === "string" ? field.options.type : undefined;
    const Icon = optionType ? typeIcons[optionType] : undefined;
    const inputType =
      optionType === "email" ? "email" : optionType === "tel" ? "tel" : "text";

    return (
      <TextField
        {...restProps}
        value={value ?? ""}
        inputRef={ref}
        label={label}
        type={inputType}
        required={Boolean(field?.required)}
        slotProps={{
          input: {
            readOnly: Boolean(field?.readonly),
            ...(Icon
              ? {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon className="size-4" />
                    </InputAdornment>
                  ),
                }
              : {}),
          },
        }}
      />
    );
  }
);

EditComponent.displayName = "EditComponent";

export { EditComponent };

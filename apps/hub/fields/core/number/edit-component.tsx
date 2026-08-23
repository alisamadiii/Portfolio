"use client";

import { forwardRef } from "react";

import { TextField } from "@/components/ui/form-fields";

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLInputElement>) => {
    const { field, value, onChange, ...restProps } = props;
    const label =
      field?.label === false ? undefined : field?.label || field?.name;

    return (
      <TextField
        {...restProps}
        inputRef={ref}
        type="number"
        label={label}
        value={value ?? ""}
        onChange={onChange}
        required={Boolean(field?.required)}
        slotProps={{
          input: { readOnly: Boolean(field?.readonly) },
          htmlInput: {
            min: field?.options?.min ?? undefined,
            max: field?.options?.max ?? undefined,
            step: field?.options?.step ?? undefined,
          },
        }}
      />
    );
  }
);

EditComponent.displayName = "EditComponent";

export { EditComponent };

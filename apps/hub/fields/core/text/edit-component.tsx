"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

import { TextArea } from "@/components/ui/form-fields";

/**
 * Multiline text field — Google/Material outlined textarea. Self-labels from the
 * schema (entry-form suppresses its own FormLabel for this type).
 */
const EditComponent = forwardRef((props: any, ref) => {
  const { field, value, ...restProps } = props;
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => internalRef.current);

  const label =
    field?.label === false ? undefined : field?.label || field?.name;

  return (
    <TextArea
      {...restProps}
      value={value ?? ""}
      inputRef={internalRef}
      label={label}
      required={Boolean(field?.required)}
      minRows={3}
      slotProps={{
        input: { readOnly: Boolean(field?.readonly) },
        htmlInput: {
          minLength: field?.options?.minlength,
          maxLength: field?.options?.maxlength,
        },
      }}
    />
  );
});

EditComponent.displayName = "EditComponent";

export { EditComponent };

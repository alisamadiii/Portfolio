"use client";

import { forwardRef, type ComponentType } from "react";

import { TextField } from "@/components/ui/form-fields";
import { Mail, Phone } from "@/components/icon";

/** External-link glyph for url fields — inherits size (`size-4`) + currentColor. */
function UrlIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12.25,1H6.25c-1.517,0-2.75,1.233-2.75,2.75V13.25c0,.059,.014,.114,.017,.172l5.922-5.922h-2.2c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75h4.01c.414,0,.75,.336,.75,.75v4.01c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75v-2.2l-6.392,6.393c.504,.633,1.272,1.047,2.142,1.047h6c1.517,0,2.75-1.233,2.75-2.75V3.75c0-1.517-1.233-2.75-2.75-2.75Z"></path>
      <path d="M3.517,13.422l-2.298,2.298c-.293,.293-.293,.768,0,1.061,.146,.146,.338,.22,.53,.22s.384-.073,.53-.22l1.827-1.827c-.34-.427-.554-.953-.59-1.531Z"></path>
    </svg>
  );
}

const typeIcons: Record<string, ComponentType<{ className?: string }>> = {
  url: UrlIcon,
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
            ...(Icon ? { startAdornment: <Icon className="size-4" /> } : {}),
          },
        }}
      />
    );
  }
);

EditComponent.displayName = "EditComponent";

export { EditComponent };

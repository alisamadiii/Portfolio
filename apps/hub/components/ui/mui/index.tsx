"use client";

import { forwardRef } from "react";
import MenuItem from "@mui/material/MenuItem";
import MuiTextField, { type TextFieldProps } from "@mui/material/TextField";

/**
 * Google/Material floating-label fields, hub-themed. Thin wrappers over MUI so
 * call sites import from one place and refs bind cleanly to react-hook-form
 * (`Controller`'s `field.ref` → MUI `inputRef`). onChange already emits
 * `event.target.value`, so RHF binding is a plain spread.
 */

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(props, ref) {
    return <MuiTextField inputRef={ref} {...props} />;
  }
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextFieldProps & { minRows?: number }
>(function TextArea({ minRows = 3, ...props }, ref) {
  return <MuiTextField inputRef={ref} multiline minRows={minRows} {...props} />;
});

export type SelectOption = { label: string; value: string };

/** Simple single-choice select only — the searchable combobox stays as-is. */
export const Select = forwardRef<
  HTMLInputElement,
  TextFieldProps & { options?: SelectOption[] }
>(function Select({ options, children, ...props }, ref) {
  return (
    <MuiTextField select inputRef={ref} {...props}>
      {options
        ? options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))
        : children}
    </MuiTextField>
  );
});

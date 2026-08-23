"use client";

import { forwardRef, useId, type ReactNode, type Ref } from "react";

import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Label-above form fields backed by shadcn primitives — the drop-in replacement
 * for the old Material `TextField` / `TextArea` wrappers (same call-site API:
 * `label`, `value`, `onChange`→`event.target.value`, `required`, `error`,
 * `helperText`, `slotProps`, `inputRef`). No floating labels; the label sits
 * above the control to match the Canvas Editor v2 design.
 */

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

type SlotProps = {
  /** Props for the control itself (readOnly + an optional leading icon). */
  input?: { readOnly?: boolean; startAdornment?: ReactNode };
  /** Native attributes forwarded to the underlying element (min/max/maxLength…). */
  htmlInput?: Record<string, unknown>;
};

type FieldChrome = {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  fullWidth?: boolean;
  /** Accepted for API-compat with the old wrappers; visual size is fixed. */
  size?: "small" | "medium";
  slotProps?: SlotProps;
};

function FieldShell({
  id,
  label,
  required,
  helperText,
  error,
  fullWidth,
  children,
}: {
  id: string;
  label?: ReactNode;
  required?: boolean;
  helperText?: ReactNode;
  error?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth !== false && "w-full")}>
      {label != null && label !== false && (
        <Label htmlFor={id} className="text-muted-foreground text-xs font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {helperText != null && helperText !== "" && (
        <p
          className={cn(
            "text-xs",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = FieldChrome &
  Omit<React.ComponentProps<"input">, "size"> & {
    inputRef?: Ref<HTMLInputElement>;
  };

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      helperText,
      error,
      fullWidth,
      size: _size,
      slotProps,
      inputRef,
      className,
      id,
      required,
      ...rest
    },
    ref
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const startAdornment = slotProps?.input?.startAdornment;
    const readOnly = slotProps?.input?.readOnly;
    const htmlInput = slotProps?.htmlInput ?? {};

    const input = (
      <Input
        id={inputId}
        ref={mergeRefs(ref, inputRef)}
        required={required}
        readOnly={readOnly}
        aria-invalid={error || undefined}
        className={cn(startAdornment && "pl-9", className)}
        {...htmlInput}
        {...rest}
      />
    );

    return (
      <FieldShell
        id={inputId}
        label={label}
        required={required}
        helperText={helperText}
        error={error}
        fullWidth={fullWidth}
      >
        {startAdornment ? (
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 items-center">
              {startAdornment}
            </span>
            {input}
          </div>
        ) : (
          input
        )}
      </FieldShell>
    );
  }
);

type TextAreaProps = FieldChrome &
  React.ComponentProps<"textarea"> & {
    inputRef?: Ref<HTMLTextAreaElement>;
    /** Material carry-over: minimum visible rows. */
    minRows?: number;
  };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      label,
      helperText,
      error,
      fullWidth,
      size: _size,
      slotProps,
      inputRef,
      className,
      id,
      required,
      minRows = 3,
      rows,
      ...rest
    },
    ref
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const readOnly = slotProps?.input?.readOnly;
    const htmlInput = slotProps?.htmlInput ?? {};

    return (
      <FieldShell
        id={inputId}
        label={label}
        required={required}
        helperText={helperText}
        error={error}
        fullWidth={fullWidth}
      >
        <Textarea
          id={inputId}
          ref={mergeRefs(ref, inputRef)}
          required={required}
          readOnly={readOnly}
          rows={rows ?? minRows}
          aria-invalid={error || undefined}
          className={cn("resize-y", className)}
          {...htmlInput}
          {...rest}
        />
      </FieldShell>
    );
  }
);

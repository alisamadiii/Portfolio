import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

import { InputGroup } from "./input-group";

export const inputVariants = cva(
  "bg-background file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xl: "h-12 rounded-full px-4 has-[>svg]:px-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Input({
  className,
  type,
  variant,
  size,
  label,
  ...props
}: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & { label: string }) {
  return (
    <label className="">
      <InputGroup className="flex h-auto flex-col items-start -space-y-1 rounded-sm">
        <p
          className="text-muted-foreground aria-invalid:text-destructive pointer-events-none px-4 pt-2 pb-0 text-xs font-normal select-none"
          aria-invalid={props["aria-invalid"]}
        >
          {label}
        </p>
        <input
          type={type}
          data-slot="input-group-control"
          className={cn(
            inputVariants({
              variant,
              size,
              className: cn(
                "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
                "text-lg! font-medium",
                className
              ),
            })
          )}
          {...props}
        />
      </InputGroup>
    </label>
  );
}

export { Input };

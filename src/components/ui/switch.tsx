import React, { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  disabled?: boolean;
}

const Switch = forwardRef<HTMLInputElement, Props>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <label className={`toggler-wrapper style-1 ${disabled && "opacity-50"}`}>
        <input type={cn("checkbox", className)} {...props} ref={ref} />
        <div className="toggler-slider">
          <div className="toggler-knob"></div>
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export default Switch;

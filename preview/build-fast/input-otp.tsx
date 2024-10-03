import React, { useState } from "react";
import { OTPInput, SlotProps } from "input-otp";

import { cn } from "@/lib/utils";

export default function InputOtp() {
  const [isCompleted, setIsCompleted] = useState(false);

  const onCompleteHandler = (value: number) => {
    setIsCompleted(true);

    console.log(value);
  };

  return (
    <div>
      <OTPInput
        maxLength={6}
        containerClassName="group flex items-center has-[:disabled]:opacity-30"
        onComplete={onCompleteHandler}
        disabled={isCompleted}
        render={({ slots }) => (
          <>
            <div className="flex">
              {slots.slice(0, 3).map((slot, idx) => (
                <Slot key={idx} {...slot} />
              ))}
            </div>

            <FakeDash />

            <div className="flex">
              {slots.slice(3).map((slot, idx) => (
                <Slot key={idx} {...slot} />
              ))}
            </div>
          </>
        )}
      />

      <p className="mt-4 text-center">{isCompleted && "Processing"}</p>
    </div>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "relative h-14 w-10 text-[2rem]",
        "flex items-center justify-center",
        "transition-all duration-100",
        "border-wrapper border-y border-r first:rounded-l-md first:border-l last:rounded-r-md",
        "outline outline-0 outline-accent-foreground/20",
        { "outline-4 outline-foreground": props.isActive }
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && <FakeCaret />}
    </div>
  );
}

function FakeCaret() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="h-8 w-px bg-white" />
    </div>
  );
}

function FakeDash() {
  return (
    <div className="flex w-10 items-center justify-center">
      <div className="h-1 w-3 rounded-full bg-border" />
    </div>
  );
}

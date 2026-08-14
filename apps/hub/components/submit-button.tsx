"use client";

import { Loader } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@workspace/ui/components/button";

export function SubmitButton({ ...props }) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" disabled={props.disabled || pending}>
      {props.children}
      {pending && <Loader className="size-4 animate-spin" />}
    </Button>
  );
}

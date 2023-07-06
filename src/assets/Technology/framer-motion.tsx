import React, { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends HTMLAttributes<HTMLOrSVGElement> {}

export default function FramerMotion({ className, ...props }: Props) {
  return <div>FramerMotion</div>;
}

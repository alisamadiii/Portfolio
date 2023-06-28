import { twMerge } from "tailwind-merge";
import clsx, { ClassArray } from "clsx";

export function cn(...inputs: ClassArray) {
  return twMerge(clsx(...inputs));
}

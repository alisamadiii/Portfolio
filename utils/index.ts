import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// this function is for reusable components, e.g buttons
function cn(...inputs: ClassValue[]): any {
  return twMerge(clsx(inputs));
}

export { cn };

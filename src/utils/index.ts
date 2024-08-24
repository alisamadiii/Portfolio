import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// this function is for reusable components, e.g buttons
export function cn(...inputs: ClassValue[]): any {
  return twMerge(clsx(inputs));
}

export const myImage =
  "https://pbs.twimg.com/profile_images/1774123575248830466/e0rbeSop_400x400.jpg";

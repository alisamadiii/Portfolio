import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// this function is for reusable components, e.g buttons
function cn(...inputs: ClassValue[]): any {
  return twMerge(clsx(inputs));
}

function colorSpecificText(text: string) {
  const styleParagraph = text.replaceAll(/@(\w+)/g, "<strong>$1</strong>");

  return styleParagraph;
}

// Video Duration
function formatTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export { cn, colorSpecificText, formatTime };

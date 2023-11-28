import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";

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

// formate date
function formateDate(date: string) {
  const parsedDate = new Date(date);

  const formattedDate: string = format(parsedDate, " HH:mm yyyy-MM-dd");

  return formattedDate;
}

// formate date
function formateDateDistance(date: string) {
  const parsedDate = new Date(date);

  const formattedDate: string = formatDistance(new Date(), parsedDate);

  return formattedDate;
}

export { cn, colorSpecificText, formatTime, formateDate, formateDateDistance };

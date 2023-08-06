import { twMerge } from "tailwind-merge";
import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLargeNumber(number: number | any) {
  const formatter = new Intl.NumberFormat("en", { notation: "compact" });
  return formatter.format(number);
}

const Months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function convertTimestampToDateTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = addLeadingZero(date.getMonth() + 1);
  const day = addLeadingZero(date.getDate());
  let hours = date.getHours();
  const minutes = addLeadingZero(date.getMinutes());
  const seconds = addLeadingZero(date.getSeconds());

  // Determine if it's AM or PM
  const period = hours >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  hours = hours % 12 || 12;

  return `${Months[Number(month) - 1]} ${day}`;
}

// Function to add leading zeros
function addLeadingZero(value: number, length: number = 2): string {
  return value.toString().padStart(length, "0");
}

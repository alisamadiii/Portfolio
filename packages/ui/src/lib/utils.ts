import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// export const getUrlFromKey = (key: string) => {
//   if (key.startsWith("http")) return key;

//   return `${process.env.NEXT_PUBLIC_AWS_URL}/${key}`;
// };

/**
 * Formats price for display (converts cents to dollars)
 * @param priceInCents - Price in cents
 * @returns Formatted price string
 */
export const formatPrice = (priceInCents: number): string => {
  return (priceInCents / 100).toFixed(2);
};


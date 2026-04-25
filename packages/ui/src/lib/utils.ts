import { clsx, type ClassValue } from "clsx";
import { customAlphabet } from "nanoid";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

// Better Auth uses a URL-safe alphabet (62 characters)
const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Generates 32-character IDs
export const generateId = customAlphabet(alphabet, 32);

export const generateUUID = () => {
  return uuidv4();
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pathFromUrl = (url: string | undefined | null) => {
  try {
    if (!url) return null;
    // Remove protocol (http:// or https://), then split by `/` and remove the domain part.
    const path = url
      .replace(/^https?:\/\//, "")
      .split("/")
      .slice(1)
      .join("/");
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
};

export const closeDialog = () => {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

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

/**
 * Gets the error message from an error object
 * @param error - The error object
 * @returns The error message
 */
type ErrorWithResponse = {
  response?: {
    data?: {
      errors?: Array<string | { message?: string }>;
      error?: { message?: string };
      message?: string;
      detail?: string;
      err?: string;
    };
  };
  message?: string;
  detail?: string;
};

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;

  const err = error as ErrorWithResponse;

  if (Array.isArray(err?.response?.data?.errors)) {
    return err.response.data.errors
      .map((e) => (typeof e === "string" ? e : e?.message || JSON.stringify(e)))
      .join(", ");
  }

  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.err ||
    err?.response?.data?.detail ||
    err?.message ||
    err?.detail ||
    "An unknown error occurred"
  );
};

export const updateFileMetadata = (file: File, value: { name: string }) => {
  // Explicitly extract the file options/specs
  const { type, lastModified } = file;
  return new File([file], value.name, { type, lastModified });
};

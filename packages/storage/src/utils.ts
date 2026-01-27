/**
 * Extracts the storage key/path from a URL
 * @param url - The full URL or path
 * @returns The storage key or null if invalid
 */
export const pathFromUrl = (url: string | undefined | null) => {
  try {
    if (!url) return null;
    // Remove query parameters (everything after ?), then remove protocol (http:// or https://), then split by `/` and remove the domain part.
    const path = url
      .split("?")[0] // Remove query parameters
      .replace(/^https?:\/\//, "")
      .split("/")
      .slice(1)
      .join("/");
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
};

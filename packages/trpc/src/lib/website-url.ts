/**
 * A website URL typed by a person ("acme.com", "https://www.acme.com/x") →
 * its https origin, or null when it isn't a usable URL.
 */
export const normalizeWebsiteUrl = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return null;
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProto);
    if (!url.hostname.includes(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
};

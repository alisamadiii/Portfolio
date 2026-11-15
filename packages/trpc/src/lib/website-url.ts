// The server fetches this URL (frame-policy check), so it must be a public
// website: no IP literals, local or internal names, or custom ports.
const isPrivateHost = (hostname: string) =>
  /^[\d.]+$/.test(hostname) ||
  hostname.startsWith("[") ||
  hostname === "localhost" ||
  /\.(localhost|local|internal|lan|home|corp)$/i.test(hostname);

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
    if (isPrivateHost(url.hostname) || url.port) return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
};

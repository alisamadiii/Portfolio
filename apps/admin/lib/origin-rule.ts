// Client-side mirror of the worker's origin-rule validation, for inline form
// errors before the API's authoritative check.
// Keep in sync with apps/api/src/lib/origins.ts.

function isCanonicalOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
function isBareDomain(value: string): boolean {
  if (!DOMAIN_RE.test(value)) return false;
  try {
    return new URL(`http://${value}`).hostname === value;
  } catch {
    return false;
  }
}

export function isValidOriginRule(value: string): boolean {
  return /^https?:\/\//.test(value)
    ? isCanonicalOrigin(value)
    : isBareDomain(value);
}

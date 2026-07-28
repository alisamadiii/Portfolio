import { AgencyClient, type Result } from "@alisamadiillc/agency-api";

// Browser-side agency API client. Requests go through the /api/agency proxy,
// which validates the admin session and attaches the real key server-side —
// the "proxy" placeholder only satisfies the SDK's non-empty check and is
// replaced before anything leaves the app. A relative base is fine: the SDK
// builds URLs by string concatenation, not new URL().
export const agency = new AgencyClient("proxy", { baseUrl: "/api/agency" });

// Bridge the SDK's { data, error } Result to react-query's throw semantics.
export function unwrap<T>(result: Result<T>): T {
  if (result.error) throw result.error;
  return result.data as T;
}

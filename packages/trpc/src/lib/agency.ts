import "server-only";

import { AgencyClient } from "@alisamadiillc/agency-api";

let client: AgencyClient | null = null;

export const agency = () => {
  if (!client) {
    const apiKey = process.env.AGENCY_API_KEY;

    if (!apiKey) {
      throw new Error("Missing AGENCY_API_KEY in environment variables");
    }

    // AGENCY_API_URL points local dev at `wrangler dev` (http://localhost:8787);
    // unset in production, where the client's default deployed URL applies.
    client = new AgencyClient(apiKey, {
      baseUrl: process.env.AGENCY_API_URL || undefined,
    });
  }
  return client;
};

import "server-only";

import { AgencyClient } from "@alisamadiillc/agency-api";

let client: AgencyClient | null = null;

export const agency = () => {
  if (!client) {
    const apiKey = process.env.AGENCY_API_KEY;

    if (!apiKey) {
      throw new Error("Missing AGENCY_API_KEY in environment variables");
    }

    client = new AgencyClient(apiKey);
  }
  return client;
};

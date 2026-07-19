import { AgencyClient } from "@alisamadiillc/agency-api";

let client: AgencyClient | null = null;

export function agency() {
  if (!client) {
    client = new AgencyClient(process.env.NEXT_PUBLIC_AGENCY_API_KEY!);
  }
  return client;
}

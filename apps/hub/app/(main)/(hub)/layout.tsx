import { headers } from "next/headers";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { AgencySeed } from "@/components/query-seeds";

// The Hub has two UIs: the website one (@website) and the lead-generation
// agency one (@agency). Each slot is a full tree with its own shell, sidebar
// and pages; this is the only place that decides which one a user gets.
export default async function HubLayout({
  agency,
  website,
}: {
  children: React.ReactNode;
  agency: React.ReactNode;
  website: React.ReactNode;
}) {
  const caller = createHttpCaller(await headers());
  const agencyClient = await caller.agency.me.query();

  if (!agencyClient) return website;

  return <AgencySeed agency={agencyClient}>{agency}</AgencySeed>;
}

import { cookies, headers } from "next/headers";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { AgencySeed } from "@/components/query-seeds";
import { HubViewProvider } from "@/components/hub-view";
import { HUB_VIEW_COOKIE, resolveHubView } from "@/lib/hub-view";

// The Hub has two UIs: the website one (@website) and the lead-generation
// agency one (@agency). Each slot is a full tree with its own shell, sidebar
// and pages; this is the only place that decides which one a user gets.
//
// Agency clients choose between the two with the sidebar switch (saved in the
// hub-view cookie); everyone else only ever gets the website UI.
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
  const eligible = Boolean(agencyClient);

  const cookieValue = (await cookies()).get(HUB_VIEW_COOKIE)?.value;
  const view = resolveHubView(eligible, cookieValue);

  if (view === "website") {
    return (
      <HubViewProvider view="website" eligible={eligible}>
        {website}
      </HubViewProvider>
    );
  }

  return (
    <HubViewProvider view="agency">
      <AgencySeed agency={agencyClient!}>{agency}</AgencySeed>
    </HubViewProvider>
  );
}

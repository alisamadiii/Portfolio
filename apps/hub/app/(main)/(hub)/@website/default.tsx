import { AgencyNotReady } from "@/components/agency/agency-not-ready";

// A URL only the agency UI has (e.g. /agency) lands here for users without an
// active agency client: tell them to talk to the admin. Anything else is a 404.
export default function Default() {
  return <AgencyNotReady />;
}

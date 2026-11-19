import { redirect } from "next/navigation";

import { docsUrl } from "@/lib/docs-links";

// The Client Hub guide lives on the agency docs site only.
export default function GuidePage() {
  redirect(docsUrl("client-hub/getting-started"));
}

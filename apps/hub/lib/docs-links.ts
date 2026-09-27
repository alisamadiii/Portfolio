import { urls } from "@workspace/ui/lib/company";

// Client-facing docs on the agency site. Env-aware via urls.agency so links
// hit localhost:3004 in dev and agency.alisamadii.com in prod.
export const docsUrl = (path: string) => `${urls.agency}/docs/${path}`;

export const DOCS_RESOURCES = [
  {
    title: "Getting started with your Hub",
    href: docsUrl("client-hub/getting-started"),
  },
  {
    title: "Editing your site with AI",
    href: docsUrl("client-hub/ai-editing"),
  },
  {
    title: "Analytics, emails & speed",
    href: docsUrl("client-hub/features"),
  },
  {
    title: "How we work, step by step",
    href: docsUrl("how-we-work/process"),
  },
  {
    title: "Your handoff document",
    href: docsUrl("ownership/client-handoff"),
  },
];

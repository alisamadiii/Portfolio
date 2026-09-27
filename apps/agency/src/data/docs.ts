// ═══════════════════════════════════════════════════════════════
//  DOCS — grouped tree for the /docs sidebar and index
// ═══════════════════════════════════════════════════════════════
//
// A doc's group is its folder inside src/content/docs — drop an MDX file
// into a new folder and it shows up as a new sidebar group automatically.
// Add the folder here only to control its label or position.

import { getCollection, type CollectionEntry } from "astro:content";

export const GROUP_ORDER = ["client-hub", "how-we-work", "ownership"];

export const GROUP_LABELS: Record<string, string> = {
  "client-hub": "Client Hub",
  "how-we-work": "How We Work",
  ownership: "Ownership",
};

export interface DocsGroup {
  group: string;
  label: string;
  docs: CollectionEntry<"docs">[];
}

const labelFor = (group: string) =>
  GROUP_LABELS[group] ??
  group.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function getDocsTree(): Promise<DocsGroup[]> {
  const entries = await getCollection("docs", ({ data }) => !data.draft);
  const byGroup = new Map<string, CollectionEntry<"docs">[]>();
  for (const entry of entries) {
    const group = entry.id.split("/")[0];
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push(entry);
  }
  const groups = [...byGroup.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
  return groups.map((group) => ({
    group,
    label: labelFor(group),
    docs: byGroup
      .get(group)!
      .sort(
        (a, b) =>
          a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
      ),
  }));
}

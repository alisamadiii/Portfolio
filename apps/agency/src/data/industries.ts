// Industry-vertical landing pages (/pest-control, roofing and handyman
// later). Each is a standalone bespoke page under src/pages/<slug>.astro —
// this registry only feeds navigation (footer). Add an entry when a new
// vertical page ships.

export interface Industry {
  slug: string;
  name: string;
}

export const industries: Industry[] = [
  { slug: "pest-control", name: "Pest Control" },
];

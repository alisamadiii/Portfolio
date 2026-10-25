// ─── Starter negative keyword lists ──────────────────────────────
// Curated lists from the local-ads playbook, applied to a client's Google Ads
// account as shared NEGATIVE_KEYWORDS sets. Keywords are resolved server-side
// from this const (the client only sends a list key).
// Pure (no server-only) so the Hub can render the chips too.

export type NegativeListKeyword = {
  text: string;
  matchType: "BROAD" | "PHRASE";
};

export const INDUSTRIES = [
  "pest-control",
  "handyman",
  "barbershop",
  "restaurant",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  "pest-control": "Pest control",
  handyman: "Handyman",
  barbershop: "Barbershop",
  restaurant: "Restaurant",
};

export const NEGATIVE_LIST_KEYS = [
  "jobs",
  "diy-research",
  "price-shoppers",
  "pest-control",
  "handyman",
  "barbershop",
  "restaurant",
] as const;
export type NegativeListKey = (typeof NEGATIVE_LIST_KEYS)[number];

export type StarterNegativeList = {
  key: NegativeListKey;
  label: string;
  // Name of the shared set in Google Ads. The idempotency key for applying:
  // never rename after shipping or old accounts get duplicate sets.
  sharedSetName: string;
  // Set on industry lists only; universal lists show for every client.
  industry?: Industry;
  words: NegativeListKeyword[];
  // Buyer words shown as a warning in the UI. Never sent to Google Ads.
  keep: string[];
  note: string;
};

export const SHARED_SET_PREFIX = "Starter: ";

// Playbook quoting convention: "quoted" = phrase match, bare = broad match.
const kw = (raw: string): NegativeListKeyword =>
  raw.startsWith('"')
    ? { text: raw.slice(1, -1), matchType: "PHRASE" }
    : { text: raw, matchType: "BROAD" };

export const STARTER_NEGATIVE_LISTS: StarterNegativeList[] = [
  {
    key: "jobs",
    label: "Jobs",
    sharedSetName: `${SHARED_SET_PREFIX}Jobs`,
    words: [
      "jobs",
      "job",
      "careers",
      "career",
      '"now hiring"',
      "hiring",
      "employment",
      "salary",
      "salaries",
      "wage",
      '"pay rate"',
      "apprentice",
      "apprenticeship",
      "internship",
      "resume",
      "indeed",
      "glassdoor",
      "ziprecruiter",
      '"job openings"',
      '"how to become"',
      '"license exam"',
      "certification",
      "school",
      "course",
      "classes",
      "training",
    ].map(kw),
    keep: ["hire a handyman"],
    note: 'Use "now hiring" as a phrase. A plain "hire" would block buyers who type "hire a handyman".',
  },
  {
    key: "diy-research",
    label: "DIY & research",
    sharedSetName: `${SHARED_SET_PREFIX}DIY & research`,
    words: [
      "diy",
      '"do it yourself"',
      "yourself",
      "myself",
      '"how to"',
      "tutorial",
      "youtube",
      "video",
      "reddit",
      "forum",
      "guide",
      "homemade",
      '"what is"',
      "definition",
      "pdf",
      "manual",
    ].map(kw),
    keep: [],
    note: "People doing it themselves or just reading. They rarely call.",
  },
  {
    key: "price-shoppers",
    label: "Price shoppers",
    sharedSetName: `${SHARED_SET_PREFIX}Price shoppers`,
    words: [
      '"free pest control"',
      '"for free"',
      '"free service"',
      "cheapest",
      "wholesale",
    ].map(kw),
    keep: ["free estimate", "free inspection", "price"],
    note: 'Never block "free" alone if the client offers free estimates. Block specific free phrases instead.',
  },
  {
    key: "pest-control",
    label: "Pest control",
    sharedSetName: `${SHARED_SET_PREFIX}Pest control`,
    industry: "pest-control",
    words: [
      '"pest control spray"',
      '"bug spray"',
      '"home depot"',
      "lowes",
      "walmart",
      "amazon",
      "ortho",
      "raid",
      "terro",
      "spectracide",
      '"mouse trap"',
      '"rat trap"',
      "poison",
      '"pest control license"',
      '"pest control technician"',
      '"pest control products"',
      '"pest control supplies"',
      "chemical",
    ].map(kw),
    keep: ["pet safe pest control", "exterminator near me"],
    note: "Product and store searches are people buying sprays and traps, not hiring a pro. Remove wildlife or bee terms only if the client handles them.",
  },
  {
    key: "handyman",
    label: "Handyman",
    sharedSetName: `${SHARED_SET_PREFIX}Handyman`,
    industry: "handyman",
    words: [
      '"handyman app"',
      '"handyman tools"',
      '"handyman jobs"',
      '"handyman salary"',
      '"handyman license"',
      '"home depot"',
      "lowes",
      '"tool rental"',
      "rental",
      "supplies",
      "parts",
      "roofing",
      "roofer",
      "hvac",
      '"general contractor license"',
    ].map(kw),
    keep: ["handyman near me", "tv mounting"],
    note: "Add plumbing or electrical only if the client doesn't do them. TaskRabbit, Angi and Thumbtack are optional, since some agencies bid on competitor names.",
  },
  {
    key: "barbershop",
    label: "Barbershop",
    sharedSetName: `${SHARED_SET_PREFIX}Barbershop`,
    industry: "barbershop",
    words: [
      '"barber school"',
      '"barber license"',
      '"barber college"',
      '"barber jobs"',
      '"barber chair"',
      '"barber supplies"',
      "clippers",
      "trimmer",
      "andis",
      "wahl",
      "babyliss",
      '"barber shop for sale"',
      '"barbershop music"',
      '"barbershop quartet"',
      '"how to cut"',
      '"fade tutorial"',
    ].map(kw),
    keep: ["haircut near me open now", "fade haircut"],
    note: 'Only block "kids haircut" or "salon" if the shop doesn\'t serve those customers.',
  },
  {
    key: "restaurant",
    label: "Restaurant",
    sharedSetName: `${SHARED_SET_PREFIX}Restaurant`,
    industry: "restaurant",
    words: [
      "jobs",
      "hiring",
      "server",
      "cook",
      "dishwasher",
      "recipe",
      "recipes",
      '"how to make"',
      "copycat",
      "calories",
      "nutrition",
      "frozen",
      "grocery",
      '"meal kit"',
      '"restaurant for sale"',
      '"restaurant equipment"',
      '"restaurant supply"',
      '"health inspection"',
    ].map(kw),
    keep: ["near me open now", "catering"],
    note: "Decide competitor chain names case by case.",
  },
];

export const starterListByKey = new Map(
  STARTER_NEGATIVE_LISTS.map((list) => [list.key, list])
);

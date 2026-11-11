// Industry filter tabs, in display order. Kept in step with INDUSTRIES in
// apps/agency/src/lib/showcase.ts so both listings group projects the same
// way. A project's industry is the first whose pattern matches its
// business.category ("Used car dealer & auto repair" -> automotive), or
// showcase.industry in _meta.json when set to one of these ids. Anything
// unmatched lands in "other".
export const INDUSTRIES = [
  { id: "restaurants", label: "Restaurants", match: /restaurant|cafe|coffee|bakery|grill|pizza|bar\b|diner|food|catering/i },
  { id: "automotive", label: "Automotive", match: /auto|car\b|car |dealer|tire|mechanic|body shop|towing|detailing/i },
  { id: "beauty", label: "Beauty & barber", match: /barber|salon|beauty|nail|spa\b|lash|brow|tattoo/i },
  { id: "home-services", label: "Home services", match: /plumb|hvac|roof|electric|handyman|landscap|lawn|pest|clean|paint|contractor|pool/i },
  { id: "health", label: "Health", match: /dent|clinic|doctor|chiropract|therap|medical|pharmacy|fitness|gym|yoga/i },
  { id: "other", label: "Other", match: null },
] as const;

export type Industry = (typeof INDUSTRIES)[number]["id"];

export const industryOf = (
  override: string | undefined,
  category: string | undefined
): Industry =>
  INDUSTRIES.find((i) => i.id === override)?.id ??
  INDUSTRIES.find((i) => i.match && category && i.match.test(category))?.id ??
  "other";

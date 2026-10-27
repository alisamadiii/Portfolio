// Business Information — step registry.
//
// Seven setup steps rendered as an overview page plus one page per step
// (Claude Design handoff in business-info-handoff/). Each step page is
// bespoke; this file holds the shared metadata (numbers, slugs, copy), the
// course prompts and the fill definitions that resolve their [BRACKET]
// tokens from saved answers.
//
// Values live in the `agency_client.business_info` jsonb map as
// Record<fieldKey, string[]>; keyword categories live in
// `agency_client.ad_campaigns`.
//
// The prompts are the Digital Marketing Guide course prompts, copied verbatim
// from the agency playbook (digital-marketing-guide/src/data/prompts.ts).
// Internal use only.

const IDENTIFY_SEGMENTS = `You are assisting in developing a targeted digital marketing strategy. Your task is to analyze the product below and identify audience segments based on real-world use cases.

Follow these steps carefully:
1. Read the product description and list of features.
2. Based on these, generate 3 specific audience segments. Each segment should represent a distinct type of user who would logically want or benefit from this product (Examples: Parents, Remote Workers, Pet Owners). Avoid vague or combined segment names.
3. For each segment, briefly explain why they are a strong match. Focus on their context, behavior, or needs, not demographics.

INPUT:
My Product Description:
[PRODUCT DESCRIPTION]

My Features:
[FEATURES]

Output Format:
Please return results in the following format (no extra commentary):

**Audience Segment:**
**Why:**`;

const VERIFY_SEGMENTS = `Objective: Determine if a specific audience segment is clearly and intentionally targeted by brands offering similar products to mine.

Audience segments to validate:
[SEGMENTS]

Instructions: You are a brand positioning analyst. Your task is to validate whether the audience segment listed above is being clearly and directly targeted by real competitors, one at a time. To qualify:
1. Find at least 3-5 competitors that sell similar products.
2. Only include a competitor if the segment is explicitly mentioned in:
   - Product title, H1 or H2 headline, Product category, Product description, SEO title or meta description
   - URL path (e.g. /for-dog-owners/, /gear-for-hikers/)
3. Skip vague or generic mentions. The targeting must be purposeful and unmistakable.

Output Format (per competitor):
- Brand: [Name of the brand or website]
- Link: [Direct link to product or category page]
- Exact Segment Mention: "..." (copy-paste the explicit phrase)
- Location of Mention: [e.g. product title, H1, URL, etc.]
- Segment Validity Score (0-10): [Rate how directly this targets the audience segment]
- Reasoning: [Briefly explain how clearly this product speaks to the segment, and why it's a strong or weak example]

Final Analysis (After All Examples): Summarize whether the segment is clearly validated based on the strength and number of examples. Conclude with one of the following:
- Validated: There's strong evidence this audience is being directly targeted.
- Partially Validated: Some evidence exists, but targeting is weak or inconsistent.
- Not Validated: Very little or no direct evidence of targeted messaging.

Wait for user approval before moving on to the next segment with the following:
Awaiting Your Input:
- Approve
- Revise
- Reject`;

const PROBLEMS_SOLUTIONS = `Task:
Now that you have identified three audience segments, your next step is to create targeted marketing messages that resonate deeply with each group.

My audience segments:
[SEGMENTS]

Instructions:
For each audience segment, complete the following:
- Problem – Identify the key pain point or challenge this group commonly experiences — something your product is designed to solve.
- Solution – Explain clearly how your product addresses that problem, referencing specific features or benefits.
- Key Message – Craft a short, impactful marketing message (max 12 words) that communicates the solution in a way that speaks directly to the segment's need.
- Focus on clarity, not cleverness.
- Avoid technical jargon.
- The message should feel like it could be a headline or ad copy.

Output Format (repeat this for each audience):

**[Audience Segment Name]**
Problem: [One sentence]
Solution: [One sentence]
Key Message: [Short marketing message – 8-12 words]`;

const TAGLINES = `Write 10 taglines for my website called [WEBSITE], that sells [PRODUCT] to [AUDIENCE SEGMENTS].`;

const SEARCH_AD_TEXT = `Create a complete set of Google Ads components for a search campaign designed to generate leads. Make sure each component uses the maximum characters allowed to optimize effectiveness and the highest possible conversion rate. Here's the info I want you to use:

Keywords:
[KEYWORDS]

Product or Service Description:
[DESCRIPTION]

Niche:
[NICHE]

Target Audience:
[TARGET AUDIENCE]

Features & Benefits:
[FEATURES & BENEFITS]

Here's what I want you to do:
Generate 7 Headlines: Each up to 30 characters, capturing different aspects like the offer, CTA, and unique features. Make sure you include the keywords.

Generate 4 Descriptions: Each up to 90 characters, detailed and engaging, highlighting the offer, benefits, and why it's a must-have.

Generate 4 Callouts: Each up to 25 characters, focusing on additional benefits like "Free Shipping", "24/7 Customer Support", etc based on the data I've given you.`;

export interface PromptFill {
  /** Storage key whose value(s) replace the [TOKEN]. */
  key: string;
  /** Human name of the missing info, shown in the AI helper checklist. */
  label: string;
  /** How a list becomes text: single value, joined lines, or "1. …" lines. */
  format?: "text" | "lines" | "numbered";
  /** Step key the value comes from (for "Add in step N" links). */
  section: string;
}

export interface PromptSpec {
  title: string;
  template: string;
  /** TOKEN (without brackets) -> where its value comes from. */
  fills: Record<string, PromptFill>;
  /** AI helper heading, plain words. */
  helperTitle: string;
  /** One line under the heading. */
  helperNote: string;
  /** Third line of the copy-paste-bring-back mini guide. */
  guideReturn: string;
}

export interface BusinessStep {
  key: string;
  /** 1-based step number. */
  step: number;
  num: string;
  part: "Brand foundation" | "Google Ads";
  title: string;
  /** Short label for the step pill bar. */
  shortLabel: string;
  /** Lead paragraph on the step page. */
  lead: string;
  /** One-line description on the overview row. */
  rowDescription: string;
  /** Rough time estimate for the overview. */
  minutes: number;
  prompts?: PromptSpec[];
}

/** The overview lives at /p/[repoId]/business-info; every step has its own slug. */
export function businessInfoUrl(repoId: number): string {
  return `/p/${repoId}/business-info`;
}

export function sectionUrl(repoId: number, key: string): string {
  return `${businessInfoUrl(repoId)}/${key}`;
}

export function stepFor(key: string): BusinessStep | undefined {
  return BUSINESS_STEPS.find((s) => s.key === key);
}

/** Turn a stored list into the text that replaces a prompt token. */
export function fillText(
  values: Record<string, string[]>,
  fill: PromptFill
): string {
  const rows = (values[fill.key] ?? []).map((r) => r.trim()).filter(Boolean);
  if (rows.length === 0) return "";
  switch (fill.format) {
    case "lines":
      return rows.join("\n");
    case "numbered":
      return rows.map((r, i) => `${i + 1}. ${r}`).join("\n");
    default:
      return rows[0] ?? "";
  }
}

/** Resolve a prompt template: filled tokens replaced, missing left as-is. */
export function resolvePrompt(
  prompt: PromptSpec,
  values: Record<string, string[]>
): { text: string; missing: PromptFill[] } {
  let text = prompt.template;
  const missing: PromptFill[] = [];
  for (const [token, fill] of Object.entries(prompt.fills)) {
    const value = fillText(values, fill);
    if (value) text = text.replaceAll(`[${token}]`, value);
    else missing.push(fill);
  }
  return { text, missing };
}

export const BUSINESS_STEPS: BusinessStep[] = [
  {
    key: "business",
    step: 1,
    num: "01",
    part: "Brand foundation",
    title: "Your business",
    shortLabel: "Your business",
    lead: "Describe what you sell once. Every later step, prompt and ad builds on what you write here.",
    rowDescription: "What you sell, your features and your main goal.",
    minutes: 10,
  },
  {
    key: "segments",
    step: 2,
    num: "02",
    part: "Brand foundation",
    title: "Audience segments",
    shortLabel: "Audience",
    lead: 'Name the three groups of people who need what you sell most. Describe who they are, not a broad category: "pest control owners with 2 to 10 trucks", not "small businesses".',
    rowDescription: "The three groups of people who need what you sell most.",
    minutes: 10,
    prompts: [
      {
        title: "Identify 3 audience segments",
        template: IDENTIFY_SEGMENTS,
        helperTitle: "Not sure? Let ChatGPT draft them.",
        helperNote: "This prompt already includes your answers from step 1.",
        guideReturn: "Bring the best three back here",
        fills: {
          "PRODUCT DESCRIPTION": {
            key: "productDescription",
            label: "What you sell",
            section: "business",
          },
          FEATURES: {
            key: "features",
            label: "Features",
            format: "lines",
            section: "business",
          },
        },
      },
      {
        title: "Verify segments with competitor data",
        template: VERIFY_SEGMENTS,
        helperTitle: "Then: check them against competitors",
        helperNote:
          "A second prompt confirms real brands target these groups.",
        guideReturn: "Keep the segments that get validated",
        fills: {
          SEGMENTS: {
            key: "segments",
            label: "Audience segments",
            format: "numbered",
            section: "segments",
          },
        },
      },
    ],
  },
  {
    key: "messaging",
    step: 3,
    num: "03",
    part: "Brand foundation",
    title: "Problem, solution & key message",
    shortLabel: "Message",
    lead: "For each audience segment: the pain they feel, how you fix it, and one headline-ready message.",
    rowDescription:
      "For each group: the pain they feel, how you fix it, one headline.",
    minutes: 10,
    prompts: [
      {
        title: "Problems, solutions & key messages",
        template: PROBLEMS_SOLUTIONS,
        helperTitle: "Let ChatGPT write the first draft.",
        helperNote: "This prompt already includes your audience segments.",
        guideReturn: "Paste the best lines back here",
        fills: {
          SEGMENTS: {
            key: "segments",
            label: "Audience segments",
            format: "numbered",
            section: "segments",
          },
        },
      },
    ],
  },
  {
    key: "taglines",
    step: 4,
    num: "04",
    part: "Brand foundation",
    title: "Taglines",
    shortLabel: "Taglines",
    lead: "One short line that says what you do and sticks. Generate ten options, keep the few you like.",
    rowDescription: "One short line that says what you do and sticks.",
    minutes: 10,
    prompts: [
      {
        title: "10 tagline options",
        template: TAGLINES,
        helperTitle: "Get 10 options in one go.",
        helperNote:
          "This prompt includes your business name, product and audience.",
        guideReturn: "Keep the ones that sound like you",
        fills: {
          WEBSITE: {
            key: "website",
            label: "Business name",
            section: "business",
          },
          PRODUCT: {
            key: "productDescription",
            label: "What you sell",
            section: "business",
          },
          "AUDIENCE SEGMENTS": {
            key: "segments",
            label: "Audience segments",
            format: "lines",
            section: "segments",
          },
        },
      },
    ],
  },
  {
    key: "purpose",
    step: 5,
    num: "05",
    part: "Brand foundation",
    title: "Brand purpose",
    shortLabel: "Purpose",
    lead: "Five quick questions about why you do this work. Answer in your own words, there are no wrong answers.",
    rowDescription: "Five quick questions about why you do this work.",
    minutes: 10,
  },
  {
    key: "keywords",
    step: 6,
    num: "06",
    part: "Google Ads",
    title: "Keywords",
    shortLabel: "Keywords",
    lead: "Group the searches you want to show up for. Each group becomes one campaign, with its keywords, average monthly searches and max CPC from Keyword Planner.",
    rowDescription:
      "Group the searches you want to show up for. Each group becomes one campaign.",
    minutes: 10,
  },
  {
    key: "search-ad",
    step: 7,
    num: "07",
    part: "Google Ads",
    title: "Search ad text",
    shortLabel: "Ad text",
    lead: "Write the headlines, descriptions and callouts for one keyword group at a time. Google mixes them, so each line has to work on its own.",
    rowDescription:
      "Headlines, descriptions and callouts for each keyword group.",
    minutes: 10,
    prompts: [
      {
        title: "Search ad text",
        template: SEARCH_AD_TEXT,
        helperTitle: "Draft every line at full length",
        helperNote: "The prompt is strongest with every answer filled in:",
        guideReturn: "Paste the lines you keep back here",
        fills: {
          KEYWORDS: {
            key: "campaignKeywords",
            label: "Keywords in this group",
            format: "lines",
            section: "keywords",
          },
          DESCRIPTION: {
            key: "productDescription",
            label: "What you sell",
            section: "business",
          },
          NICHE: {
            key: "campaignNiche",
            label: "Niche for this group",
            section: "keywords",
          },
          "TARGET AUDIENCE": {
            key: "segments",
            label: "Audience segments",
            format: "lines",
            section: "segments",
          },
          "FEATURES & BENEFITS": {
            key: "features",
            label: "Features",
            format: "lines",
            section: "business",
          },
        },
      },
    ],
  },
];

// ---- Segments are stored as one string per row ("who — why"); the step 2
// UI edits the two halves separately.

export interface SegmentParts {
  who: string;
  why: string;
}

export function splitSegment(row: string): SegmentParts {
  const text = row.trim();
  for (const sep of [" — ", ": "]) {
    const at = text.indexOf(sep);
    if (at > 0)
      return {
        who: text.slice(0, at).trim(),
        why: text.slice(at + sep.length).trim(),
      };
  }
  return { who: text, why: "" };
}

export function joinSegment({ who, why }: SegmentParts): string {
  const w = who.trim();
  const y = why.trim();
  return y ? `${w} — ${y}` : w;
}

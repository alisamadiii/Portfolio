// Business Information page — documentation-style section registry.
//
// The page renders itself from BUSINESS_SECTIONS. Each section reads like a
// chapter of the agency playbook (number, title, lead, short explanation),
// holds the client's editable values, and optionally shows the course prompt
// that generates them — with its [BRACKET] tokens auto-filled from values
// saved in earlier sections, ready to paste into ChatGPT.
//
// Values live in the `agency_client.business_info` jsonb map as
// Record<fieldKey, string[]>. Single-value fields store a one-element array;
// positional fields (brand purpose, per-segment messaging) rely on the router
// keeping interior empty slots.
//
// Every section is unique, so a field is a discriminated union of layout
// kinds. Adding a section — or a new shape of section — is a config change
// here, not a page change.
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

interface FieldBase {
  /** Stable storage key in the jsonb map. Never reuse or rename in place. */
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

/** One fixed input, stored as a one-element array. */
export interface SingleField extends FieldBase {
  kind: "single";
}

/** Open-ended rows with add/remove. */
export interface ListField extends FieldBase {
  kind: "list";
  /** Empty rows to show when nothing is saved yet. */
  initial: number;
}

/** Exactly rowLabels.length labeled inputs — no add/remove. Positional. */
export interface FixedField extends FieldBase {
  kind: "fixed";
  rowLabels: string[];
}

/**
 * A repeated block of several inputs. Block i reads/writes index i of each
 * subfield's own storage array, so the arrays stay aligned per block.
 */
export interface GroupField {
  kind: "group";
  /** Field key whose saved rows title each block (e.g. segment names). */
  titleFrom?: string;
  /** Fallback block title + count when titleFrom has no values. */
  blockLabel: string;
  count: number;
  subfields: FieldBase[];
}

export type BusinessField = SingleField | ListField | FixedField | GroupField;

export interface PromptFill {
  /** Storage key whose value(s) replace the [TOKEN]. */
  key: string;
  /** Human name of the missing info, shown when the value is empty. */
  label: string;
  /** How a list becomes text: single value, joined lines, or "1. …" lines. */
  format?: "text" | "lines" | "numbered";
  /** Section to link to when the value is missing. */
  section: string;
}

export interface PromptSpec {
  title: string;
  template: string;
  /** TOKEN (without brackets) -> where its value comes from. */
  fills: Record<string, PromptFill>;
}

export interface BusinessSection {
  key: string;
  num: string;
  title: string;
  /** One-line goal under the title. */
  lead: string;
  /** Short explanation paragraphs. */
  description?: string[];
  /** Sub-sidebar group label; unset = the default "Business" group. */
  group?: string;
  /** Rendered by its own bespoke page, not the generic [section] route. */
  custom?: boolean;
  fields: BusinessField[];
  prompts?: PromptSpec[];
}

/** Each section lives on its own page; the first one is the index route. */
export function sectionUrl(key: string): string {
  return key === "business" ? "/business-info" : `/business-info/${key}`;
}

export const BUSINESS_SECTIONS: BusinessSection[] = [
  {
    key: "business",
    num: "01",
    title: "Your business",
    lead: "Everything below builds on this. Describe what you sell once, reuse it everywhere.",
    description: [
      "These answers auto-fill every prompt on this page, and we reuse them when writing your ads, website copy, and campaigns. Keep them plain and specific.",
    ],
    fields: [
      {
        kind: "single",
        key: "productDescription",
        label: "Product / service description",
        multiline: true,
        placeholder:
          "e.g. We build, host, and manage websites for local businesses…",
      },
      {
        kind: "list",
        key: "features",
        label: "Feature",
        initial: 4,
        placeholder: "One feature or benefit, e.g. 24/7 support",
      },
      {
        kind: "single",
        key: "website",
        label: "Website / business name",
        placeholder: "e.g. Ali Samadii LLC",
      },
      {
        kind: "single",
        key: "goal",
        label: "Main goal",
        multiline: true,
        placeholder: "e.g. 20 qualified leads per month from Google",
      },
    ],
  },
  {
    key: "segments",
    num: "02",
    title: "Audience segments",
    lead: "Goal: find your audience — the exact people who need what you sell.",
    description: [
      "Your audience is the group of people or businesses that need your product or service. Identify 3 clear, distinct segments — who they are, not broad categories — then verify that real brands explicitly target them.",
    ],
    fields: [
      {
        kind: "list",
        key: "segments",
        label: "Audience segment",
        initial: 3,
        multiline: true,
        placeholder: "Segment name — and why they're a strong match.",
      },
    ],
    prompts: [
      {
        title: "Prompt — identify 3 audience segments",
        template: IDENTIFY_SEGMENTS,
        fills: {
          "PRODUCT DESCRIPTION": {
            key: "productDescription",
            label: "Product description",
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
        title: "Prompt — verify segments with competitor data",
        template: VERIFY_SEGMENTS,
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
    num: "03",
    title: "Problem, solution & key message",
    lead: "Per segment: the pain, how you solve it, one short message.",
    description: [
      "For each audience segment, name the problem they feel, how your product solves it, and one headline-ready message. These become your ad copy and landing page angles.",
    ],
    fields: [
      {
        kind: "group",
        titleFrom: "segments",
        blockLabel: "Segment",
        count: 3,
        subfields: [
          {
            key: "messagingProblem",
            label: "Problem",
            multiline: true,
            placeholder: "The key pain point this segment experiences.",
          },
          {
            key: "messagingSolution",
            label: "Solution",
            multiline: true,
            placeholder: "How your product solves it, naming features.",
          },
          {
            key: "messagingKeyMessage",
            label: "Key message",
            placeholder: "8–12 words, headline-ready.",
          },
        ],
      },
    ],
    prompts: [
      {
        title: "Prompt — problems, solutions & key messages",
        template: PROBLEMS_SOLUTIONS,
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
    num: "04",
    title: "Taglines",
    lead: "One short line that says what you do and sticks.",
    fields: [
      {
        kind: "list",
        key: "taglines",
        label: "Tagline",
        initial: 5,
        placeholder: "e.g. Fast, friendly, done right.",
      },
    ],
    prompts: [
      {
        title: "Prompt — 10 tagline options",
        template: TAGLINES,
        fills: {
          WEBSITE: {
            key: "website",
            label: "Website / business name",
            section: "business",
          },
          PRODUCT: {
            key: "productDescription",
            label: "Product description",
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
    num: "05",
    title: "Brand purpose",
    lead: "Branding is what you deliver. Marketing is how you deliver it.",
    description: [
      "A brand strategy is the target everything aims at: it makes you stand out, guides the marketing, and keeps customers loyal. Answer these five questions in your own words — there are no wrong answers.",
    ],
    fields: [
      {
        kind: "fixed",
        key: "purpose",
        label: "Brand purpose",
        multiline: true,
        rowLabels: [
          "Why do you do what you do?",
          "Who do you want to help?",
          "What can you help with?",
          "Would your audience like that?",
          "What does your audience actually like?",
        ],
      },
    ],
  },
  {
    key: "keywords",
    num: "06",
    title: "Keywords",
    lead: "Keyword categories — each category is one campaign.",
    description: [
      "Group the keywords you want to bid on into categories, like the course's Keyword Research sheet. Each category becomes its own campaign with its own keywords, average monthly searches, and max CPC from Keyword Planner.",
    ],
    group: "Google Ads",
    custom: true,
    fields: [],
  },
  {
    key: "search-ad",
    num: "07",
    title: "Search ad text",
    lead: "Headlines, descriptions, and callouts for a lead-gen Google Ads search campaign.",
    description: [
      "Pick a category and the prompt pulls in its keywords and niche, plus your product description, features, and audience segments, then writes every ad component at its maximum length. The copy you keep is saved on that category.",
    ],
    group: "Google Ads",
    custom: true,
    fields: [],
    prompts: [
      {
        title: "Prompt — search ad text",
        template: SEARCH_AD_TEXT,
        fills: {
          KEYWORDS: {
            // Pseudo-key injected from the selected campaign's keywords.
            key: "campaignKeywords",
            label: "Category keywords",
            format: "lines",
            section: "keywords",
          },
          DESCRIPTION: {
            key: "productDescription",
            label: "Product description",
            section: "business",
          },
          NICHE: {
            // Pseudo-key injected from the selected campaign's niche.
            key: "campaignNiche",
            label: "Category niche",
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

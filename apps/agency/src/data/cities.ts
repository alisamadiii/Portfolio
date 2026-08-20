// ═══════════════════════════════════════════════════════════════
//  CITIES — content source for /locations and /locations/<slug>
// ═══════════════════════════════════════════════════════════════
//
// Each entry drives one local-SEO landing page (src/pages/locations/[city].astro).
// City keyword goes in seoTitle (city-first, brand last), h1, and metaDescription's
// first clause. intro + localContext + most FAQs are hand-written per city — never
// reuse a sentence skeleton with the city name swapped, or the pages read as
// doorway pages. Prices are never hardcoded here (Stripe-synced in pricing.ts).
// FAQ content is visible on-page AND emitted as FAQPage JSON-LD from
// [city].astro — Google retired FAQ rich results (May 2026), but AI answer
// engines (ChatGPT, Perplexity, AI Overviews) still parse FAQPage, so keep
// answers self-contained. The agency is headquartered in Jacksonville; every
// other city is served remotely and the pages say so honestly — no fake offices.

export interface City {
  slug: string;
  name: string;
  county: string;
  region: string;
  populationNote: string;
  /** sameAs for the areaServed City node — entity disambiguation. */
  wikipediaUrl: string;
  /** True only for Jacksonville — unlocks the "based here" framing + LocalBusiness schema. */
  isHeadquarters?: boolean;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroSub: string;
  /** Hand-written, 120–180 words, city-specific. */
  intro: string;
  /** Hand-written, 80–120 words: industries, districts, who we help there. */
  localContext: string;
  industries: string[];
  /** 3–4 slugs of nearby cities in this array — validated below. */
  nearby: string[];
  faqs: { q: string; a: string }[];
  /** Hero band image — public/locations/<slug>.webp, generated via scripts/optimize-location-images.mjs. */
  image?: { src: string; alt: string };
  /** Extra synonyms surfaced only by site search. */
  searchKeywords?: string[];
}

export const cities: City[] = [
  // ── Jacksonville (HQ) ──────────────────────────────────────────
  {
    slug: "jacksonville",
    name: "Jacksonville",
    county: "Duval County",
    region: "Northeast Florida",
    populationNote: "Florida's largest city, ~985,000 residents",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Jacksonville,_Florida",
    image: {
      src: "/locations/jacksonville.webp",
      alt: "Main Street Bridge and the downtown Jacksonville skyline over the St. Johns River at golden hour",
    },
    isHeadquarters: true,
    seoTitle: "Jacksonville Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Jacksonville web design agency based right here in Duval County. Custom-coded sites on Next.js — not templates — with transparent pricing and fast launches.",
    h1: "Web design & development in Jacksonville, Florida",
    heroSub:
      "We're not a directory listing with a Jacksonville filter — this is home. Custom-coded websites for Duval County businesses, built by the agency that lives here.",
    intro:
      "Jacksonville is where Ali Samadi Agency is headquartered, which makes this the one city page on our site written from lived experience rather than research. We know the difference between a Riverside coffee shop and a Southside logistics firm because we've walked into both. Jacksonville is the largest city by area in the contiguous United States and the most populous in Florida, yet its small-business scene still runs on word of mouth — a strong website here isn't about outshining Manhattan-grade competition, it's about being the one contractor, clinic, or shop that actually looks credible when a neighbor searches. That's a winnable game, and it's the one we play for our own business in this exact market every day. When we tell you what ranks in Jacksonville, it's because our own site is ranking for it.",
    localContext:
      "Duval County's economy leans on logistics (JAXPORT and the rail hubs), healthcare (Mayo Clinic, Baptist Health), finance back-offices, military families around NAS Jax and Mayport, and a dense layer of home-services contractors serving the suburbs from Mandarin to Oceanway. Most of these businesses compete in Google Maps and local search, not national SERPs — which is exactly the kind of fight a fast, properly structured website wins.",
    industries: ["logistics", "healthcare", "home services", "real estate"],
    nearby: ["gainesville", "orlando", "tallahassee"],
    faqs: [
      {
        q: "Can we meet in person in Jacksonville?",
        a: "Yes. We're based in Jacksonville, so local clients can meet face to face — kickoffs, reviews, or a coffee to talk through the project. Most work still happens async through our Client Hub, but being in the same city means you can put a face to the agency.",
      },
      {
        q: "Do you work with Jacksonville's military community?",
        a: "We do. With NAS Jacksonville and Naval Station Mayport nearby, a lot of local businesses are veteran-owned or serve military families. We've built for service businesses in these corridors and understand the trust signals that audience looks for.",
      },
      {
        q: "How fast can a Jacksonville business get a site live?",
        a: "Simple sites ship in one day once the project is confirmed. Larger builds — multiple pages, CMS, custom features — are scoped upfront with a clear timeline, usually one to three weeks.",
      },
      {
        q: "Do you help with Google rankings, not just the website?",
        a: "Yes — SEO and analytics are part of what we offer. Every site ships with the technical foundation (structured data, sitemaps, fast Core Web Vitals), and we can run ongoing local SEO for Jacksonville businesses that want to climb the map pack.",
      },
    ],
    searchKeywords: [
      "jacksonville web design",
      "jacksonville website design",
      "web designer jacksonville fl",
      "jax web design",
      "duval",
    ],
  },

  // ── Miami ──────────────────────────────────────────────────────
  {
    slug: "miami",
    name: "Miami",
    county: "Miami-Dade County",
    region: "South Florida",
    populationNote: "~455,000 residents, metro area over 6 million",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Miami",
    image: {
      src: "/locations/miami.webp",
      alt: "Downtown Miami skyline across Biscayne Bay",
    },
    seoTitle: "Miami Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Miami web design for businesses that compete in a crowded market. Custom-coded, bilingual-ready sites built on Next.js — no templates, no bloated agencies.",
    h1: "Web design & development for Miami businesses",
    heroSub:
      "In a market this loud, a template site disappears. We build custom-coded, fast-loading websites that give Miami businesses an edge templates can't fake.",
    intro:
      "No Florida market punishes a mediocre website faster than Miami. With a metro of over six million people and one of the highest rates of new business formation in the country, whatever you sell, dozens of competitors are selling it within ten miles — and the ones winning attention have invested in how they look online. That cuts both ways: Miami customers are visually literate, so a genuinely well-designed site stands out here more than it would anywhere else in the state. We build for that bar. Custom code instead of a page-builder theme means your site loads fast on a phone in traffic on the Palmetto, reads cleanly in English or Spanish, and doesn't resemble the four other businesses on your block that bought the same template. Miami rewards distinctive; we build distinctive.",
    localContext:
      "Miami-Dade's business landscape spans hospitality and restaurants from South Beach to Coral Gables, real estate and development in Brickell, a fast-growing tech and finance scene downtown, logistics tied to PortMiami and MIA, and thousands of family-run service businesses across neighborhoods like Little Havana, Kendall, and Doral. Many operate bilingually — a site that handles both English and Spanish audiences well is a real competitive advantage here, not a nice-to-have.",
    industries: ["hospitality", "real estate", "tech & finance", "restaurants"],
    nearby: ["hialeah", "fort-lauderdale", "hollywood"],
    faqs: [
      {
        q: "Do you build bilingual English/Spanish websites?",
        a: "Yes. For Miami businesses serving both audiences, we can build properly structured bilingual sites — real translated pages with correct hreflang tags, not a widget that machine-translates on the fly. Search engines index both languages, and each audience gets a native experience.",
      },
      {
        q: "My Miami market is saturated. Can a website actually help?",
        a: "In saturated markets the website matters more, not less. When five businesses offer the same service, customers compare them online first — speed, design, reviews, and clarity decide who gets the call. We build sites specifically to win that comparison.",
      },
      {
        q: "Do you work with Miami restaurants and hospitality businesses?",
        a: "Yes — menus, reservations, event spaces, hotel and short-term-rental sites. Hospitality sites need to look great on phones above all, since that's where nearly all of that traffic comes from, and that's how we build them.",
      },
      {
        q: "How does working remotely with you actually work?",
        a: "We're headquartered in Jacksonville and work with Miami clients over video calls and our Client Hub, where you follow progress, leave feedback, and edit your own site after launch. Same state, same time zone — most clients never feel the distance.",
      },
    ],
    searchKeywords: [
      "miami web design",
      "miami website design",
      "web designer miami fl",
      "bilingual website",
      "brickell",
    ],
  },

  // ── Tampa ──────────────────────────────────────────────────────
  {
    slug: "tampa",
    name: "Tampa",
    county: "Hillsborough County",
    region: "Tampa Bay",
    populationNote: "~400,000 residents, heart of the Tampa Bay metro",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Tampa,_Florida",
    image: {
      src: "/locations/tampa.webp",
      alt: "Tampa Riverwalk and the downtown skyline along the Hillsborough River",
    },
    seoTitle: "Tampa Website Design & Development — Ali Samadi Agency",
    metaDescription:
      "Tampa website design built with custom code, not drag-and-drop templates. Fast, modern sites for Tampa Bay businesses — transparent pricing, quick launches.",
    h1: "Website design & development for Tampa businesses",
    heroSub:
      "Tampa Bay is growing faster than almost any metro in the country. We build the kind of website that keeps up — custom-coded, fast, and easy to update yourself.",
    intro:
      "Tampa has spent the last decade turning from a regional port city into one of the fastest-growing metros in America, and its business web presence hasn't caught up. Search for almost any local service in Hillsborough County and you'll find a first page full of sites built in 2015 — slow, not mobile-friendly, and running on abandoned WordPress themes. For a new or rebranding Tampa business, that's an opening. A custom-coded site that loads instantly and looks current doesn't just represent you well; it visibly outclasses most of the local competition the moment someone compares tabs. We build exactly that, and because our sites are hand-coded rather than assembled in a page builder, they stay fast as you add pages, photos, and content over the years instead of slowly rotting the way template sites do.",
    localContext:
      "Tampa's economy mixes finance and insurance headquarters downtown, the port and distribution businesses along the channel, healthcare systems like Tampa General and Moffitt, a booming construction and real-estate sector chasing the population influx, and hospitality stretching from Ybor City to the Riverwalk. Wesley Chapel, Brandon, and Carrollwood add thousands of suburban home-services businesses — plumbers, roofers, landscapers — competing hard in local search.",
    industries: ["construction", "healthcare", "finance", "home services"],
    nearby: ["st-petersburg", "sarasota", "orlando"],
    faqs: [
      {
        q: "Do you build sites for Tampa contractors and trades?",
        a: "Frequently. Contractor sites live or die on local search and mobile speed — a homeowner with a burst pipe isn't browsing on a desktop. We build fast, review-forward sites with clear calls-to-action that turn searches into phone calls.",
      },
      {
        q: "My Tampa business is growing fast. Will the site scale with us?",
        a: "Yes — that's a core reason we hand-code instead of using page builders. Adding locations, service pages, or a blog doesn't slow the site down, and the CMS lets your team make updates without calling a developer.",
      },
      {
        q: "Can you redesign my existing outdated site?",
        a: "Yes. Many Tampa projects are redesigns of aging WordPress or Wix sites. We rebuild on modern code, migrate your content, and set up redirects properly so you keep the Google rankings your old site earned.",
      },
      {
        q: "Do you serve the whole Tampa Bay area?",
        a: "We do — Tampa, St. Petersburg, Clearwater, Brandon, Wesley Chapel, and everywhere in between. We work remotely from Jacksonville with video calls and a Client Hub where you track everything, so your exact address in the Bay doesn't matter.",
      },
    ],
    searchKeywords: [
      "tampa web design",
      "tampa website design",
      "web designer tampa fl",
      "tampa bay",
      "hillsborough",
    ],
  },

  // ── Orlando ────────────────────────────────────────────────────
  {
    slug: "orlando",
    name: "Orlando",
    county: "Orange County",
    region: "Central Florida",
    populationNote: "~320,000 residents, 75+ million annual visitors",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Orlando,_Florida",
    image: {
      src: "/locations/orlando.webp",
      alt: "Lake Eola fountain and the downtown Orlando skyline framed by cypress trees",
    },
    seoTitle: "Orlando Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Orlando web design for the businesses behind the theme parks — custom-coded sites that win local customers and tourist traffic alike. No templates.",
    h1: "Web design & development for Orlando businesses",
    heroSub:
      "Seventy-five million visitors a year search Orlando businesses from their hotel rooms. We build websites that capture that traffic — and the local customers who live here year-round.",
    intro:
      "Orlando businesses serve two completely different audiences at once, and most of their websites acknowledge neither. There are the seventy-five-million-plus annual visitors searching from hotel rooms and rental cars — high intent, zero local knowledge, deciding in seconds. And there are the two-and-a-half million Central Florida residents who live in Winter Park, Kissimmee, and Lake Nona and need the same dentists, gyms, and repair shops as anyone else. A tourist-facing site needs instant clarity and mobile speed; a local-facing site needs to win the map pack against entrenched competitors. We build for whichever fight your business is in — sometimes both — with custom-coded pages structured so Google understands exactly who you serve and where. Either way, the era of getting by on a slow template site ended when your competitors stopped using them.",
    localContext:
      "Beyond the parks, Orange County runs on hospitality and events anchored by the convention center — one of the busiest in the nation — plus a serious tech and simulation cluster around Lake Nona and UCF's research corridor, healthcare systems like AdventHealth and Orlando Health, and a huge base of tourism-adjacent service businesses: transportation, vacation rentals, restaurants, and entertainment. Local search competition here is among the fiercest in Florida because the customer pool is so large.",
    industries: ["hospitality", "tourism", "tech & simulation", "healthcare"],
    nearby: ["tampa", "jacksonville", "port-st-lucie"],
    faqs: [
      {
        q: "Can my site target tourists and locals at the same time?",
        a: "Yes, with the right structure — separate landing pages for visitor-intent and local-intent searches, each optimized for how that audience actually searches. One generic homepage trying to do both usually wins neither.",
      },
      {
        q: "Do you build sites for vacation rentals and tourism businesses?",
        a: "We do — vacation rental brands, tour operators, transportation companies, and event businesses. These sites need fast mobile pages and friction-free booking or inquiry flows, because the customer is often deciding same-day.",
      },
      {
        q: "How is a custom-coded site better for Orlando's competitive search market?",
        a: "Speed and structure. Custom code lets us hit top Core Web Vitals scores and add precise structured data — two levers template sites handle poorly. In a market with this many competitors, technical advantages compound.",
      },
      {
        q: "Where are you located?",
        a: "We're headquartered in Jacksonville, about two hours up I-95, and serve Orlando remotely. Calls happen over video, and our Client Hub gives you a live window into the project — progress, previews, and post-launch editing.",
      },
    ],
    searchKeywords: [
      "orlando web design",
      "orlando website design",
      "web designer orlando fl",
      "kissimmee",
      "winter park",
    ],
  },

  // ── St. Petersburg ─────────────────────────────────────────────
  {
    slug: "st-petersburg",
    name: "St. Petersburg",
    county: "Pinellas County",
    region: "Tampa Bay",
    populationNote: "Florida's fifth-largest city, ~260,000 residents",
    wikipediaUrl: "https://en.wikipedia.org/wiki/St._Petersburg,_Florida",
    image: {
      src: "/locations/st-petersburg.webp",
      alt: "Sailboats in the downtown St. Petersburg marina on Tampa Bay at dusk",
    },
    seoTitle: "St. Petersburg Web Design — Ali Samadi Agency",
    metaDescription:
      "St. Petersburg web design with actual design taste — custom-coded websites for St. Pete's creative businesses, galleries, restaurants, and local services.",
    h1: "Web design & development for St. Petersburg businesses",
    heroSub:
      "St. Pete built its identity on arts and independent business. Your website should look like it belongs here — custom-designed, not a template with your logo dropped in.",
    intro:
      "St. Petersburg reinvented itself as Florida's arts city — the murals, the Dalí, the galleries along Central Avenue — and its independent business scene carries that same expectation of taste. A generic template site reads especially wrong here, where customers actively prefer local and independent over chain and corporate. The good news is the bar for standing out is aesthetic, not budgetary: a thoughtfully designed site with real typography, real photography, and fast load times immediately separates a St. Pete business from competitors who bought a theme. That's our lane. We design custom and code by hand, which means your site can actually express what makes your business worth choosing — and still hit the technical marks that get you found in Pinellas County local search, where the density of small businesses makes rankings a genuine contest.",
    localContext:
      "Pinellas is the most densely populated county in Florida, packed with independent restaurants and breweries downtown, galleries and studios in the EDGE and Warehouse Arts districts, medical and marine-science employers near the waterfront, and a deep bench of home-services and professional businesses serving neighborhoods from Old Northeast to Tyrone. Tourism along the Gulf beaches — Clearwater to Pass-a-Grille — adds a visitor audience many St. Pete businesses can also capture.",
    industries: [
      "arts & creative",
      "restaurants & breweries",
      "professional services",
      "tourism",
    ],
    nearby: ["tampa", "sarasota", "cape-coral"],
    faqs: [
      {
        q: "Can you match my site to an existing brand or aesthetic?",
        a: "Yes — if you already have a strong visual identity, we build the site to carry it faithfully. If you don't, our brand identity service creates one first: logo, colors, and typography that the site is then designed around.",
      },
      {
        q: "Do you work with St. Pete restaurants, breweries, and creative businesses?",
        a: "That's a natural fit for us. These businesses win on atmosphere and identity, and their sites should too — menus that are easy to update, event calendars, and photography-forward layouts that load fast.",
      },
      {
        q: "What makes a site rank in a dense market like Pinellas County?",
        a: "Fundamentals done properly: fast pages, correct structured data, a Google Business Profile that matches the site, and content that names the neighborhoods you serve. Density means sloppy competitors — doing the basics well goes further here than people expect.",
      },
      {
        q: "Do you meet clients in St. Petersburg?",
        a: "We work remotely from Jacksonville — video calls plus a Client Hub where you follow the build and edit your site after launch. It works smoothly enough that where we sit stops mattering by week one.",
      },
    ],
    searchKeywords: [
      "st petersburg web design",
      "st pete website design",
      "web designer st petersburg fl",
      "pinellas",
    ],
  },

  // ── Fort Lauderdale ────────────────────────────────────────────
  {
    slug: "fort-lauderdale",
    name: "Fort Lauderdale",
    county: "Broward County",
    region: "South Florida",
    populationNote: "~182,000 residents, yachting capital of the world",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Fort_Lauderdale,_Florida",
    image: {
      src: "/locations/fort-lauderdale.webp",
      alt: "Sunset over the Intracoastal Waterway and the Fort Lauderdale skyline",
    },
    seoTitle: "Fort Lauderdale Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Fort Lauderdale web design for marine, luxury, and professional businesses. Custom-coded websites that match a high-end clientele — no templates.",
    h1: "Web design & development for Fort Lauderdale businesses",
    heroSub:
      "When your customers are buying yacht services, waterfront real estate, or high-end work of any kind, a cheap-looking website costs you real money. We build sites that match your market.",
    intro:
      "Fort Lauderdale's economy has a trait most cities don't: an unusually large share of its businesses sell to affluent customers. The marine industry alone — brokers, refit yards, crew services, charters around the world's yachting capital — runs on high-ticket transactions where trust is everything and first impressions happen online. The same dynamic holds for the city's waterfront real estate, aviation services around the executive airport, and luxury hospitality along the beach. For these businesses, a dated or template-built website isn't a cosmetic problem; it actively contradicts the premium positioning the rest of the business worked to earn. We build custom-designed, hand-coded sites that hold up under that scrutiny — refined design, fast performance, and the polish a discerning customer expects before they ever pick up the phone.",
    localContext:
      "Broward County pairs the marine cluster along the New River and Marina Mile with a dense professional core — law firms, financial advisors, medical practices — plus hospitality from Las Olas to the beach, and a large aviation and logistics sector around FLL. Las Olas Boulevard's retail and dining scene, and rapidly developing Flagler Village, add a steady stream of new independent businesses that need to establish credibility fast.",
    industries: [
      "marine",
      "real estate",
      "legal & professional",
      "hospitality",
    ],
    nearby: ["hollywood", "pembroke-pines", "miami"],
    faqs: [
      {
        q: "Do you build websites for marine and yachting businesses?",
        a: "Yes — brokers, charters, refit and repair, crew placement, and marine suppliers. These sites need to convey serious credibility to an international, high-net-worth audience, and often showcase inventory or vessels with heavy photography that still has to load fast.",
      },
      {
        q: "Our clientele is high-end. How does that change the website?",
        a: "Everything tightens up: typography, spacing, photography, copy. Affluent customers make snap judgments about quality, and generic design signals a generic operation. We design custom — no themes — so the site reflects the caliber of the work you actually do.",
      },
      {
        q: "Can you handle both English-speaking and international visitors?",
        a: "Yes. Fort Lauderdale's marine and real-estate markets draw international buyers, and we can structure multilingual pages with proper hreflang so each audience — and Google — gets the right version.",
      },
      {
        q: "How do we work together if you're in Jacksonville?",
        a: "Remotely, and it's smoother than it sounds: video calls for the conversations that matter, and our Client Hub for everything else — live previews, feedback, and editing your own content after launch.",
      },
    ],
    searchKeywords: [
      "fort lauderdale web design",
      "fort lauderdale website design",
      "web designer fort lauderdale",
      "broward",
      "las olas",
    ],
  },

  // ── Hialeah ────────────────────────────────────────────────────
  {
    slug: "hialeah",
    name: "Hialeah",
    county: "Miami-Dade County",
    region: "South Florida",
    populationNote: "Florida's sixth-largest city, ~220,000 residents",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Hialeah,_Florida",
    image: {
      src: "/locations/hialeah.webp",
      alt: "Calle Ocho tile mosaic in Little Havana — the Cuban heart of greater Miami",
    },
    seoTitle: "Hialeah Website Design — Ali Samadi Agency",
    metaDescription:
      "Hialeah website design for family businesses ready to grow online. Bilingual-ready, custom-coded sites at honest prices — built to bring in local customers.",
    h1: "Website design for Hialeah businesses",
    heroSub:
      "Hialeah runs on family businesses that earned their reputation the hard way. A real website makes sure new customers can find what the neighborhood already knows.",
    intro:
      "Hialeah might be the most underserved web market in Florida. It's the state's sixth-largest city, with one of the highest concentrations of small businesses per capita in the country — manufacturing shops, medical clinics, restaurants, auto services, and family companies that have thrived for decades on reputation and repeat customers. But walk through those businesses online and most either have no website or a years-old page that doesn't reflect the operation behind it. That gap is an opportunity: in a city where so few competitors have invested online, a fast, professional, bilingual site puts you at the front of local search results almost by default. We build exactly that — honest pricing, custom code, Spanish and English handled properly — for businesses ready to add Google to the word-of-mouth engine that already works.",
    localContext:
      "Hialeah's economy is distinctly hands-on: one of South Florida's largest concentrations of light manufacturing and industrial suppliers, a dense medical corridor of clinics and specialists, auto sales and repair along the Palmetto, and legendary food businesses from bakeries to ventanitas. The city is over 95% Hispanic, and business here is conducted in Spanish as much as English — websites that respect that reality convert better, full stop.",
    industries: [
      "manufacturing",
      "medical clinics",
      "auto services",
      "restaurants",
    ],
    nearby: ["miami", "hollywood", "pembroke-pines"],
    faqs: [
      {
        q: "¿Hacen sitios web en español?",
        a: "Sí. Construimos sitios completamente bilingües — páginas reales en español e inglés con la estructura técnica correcta (hreflang), no traducciones automáticas. Cada cliente ve el sitio en su idioma, y Google indexa los dos.",
      },
      {
        q: "My business has survived fine on word of mouth. Why add a website?",
        a: "Word of mouth now ends with a Google search — someone hears your name, looks you up, and judges what they find. A site doesn't replace your reputation; it catches the customers your reputation already sends, before they land on a competitor who does show up.",
      },
      {
        q: "Do you work with industrial and manufacturing businesses?",
        a: "Yes. Shops and suppliers win contracts when purchasing managers can quickly verify capabilities, certifications, and contact information online. A clear, credible site routinely pays for itself with a single new account.",
      },
      {
        q: "What does a website cost for a small Hialeah business?",
        a: "Pricing is flat and public on our pricing page — a monthly all-inclusive plan or a one-time build starting with a single page. No quotes-by-salesperson, no surprise invoices.",
      },
    ],
    searchKeywords: [
      "hialeah web design",
      "hialeah website design",
      "diseño web hialeah",
      "sitios web en español",
    ],
  },

  // ── Tallahassee ────────────────────────────────────────────────
  {
    slug: "tallahassee",
    name: "Tallahassee",
    county: "Leon County",
    region: "North Florida",
    populationNote: "Florida's capital, ~200,000 residents",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Tallahassee,_Florida",
    image: {
      src: "/locations/tallahassee.webp",
      alt: "Church steeples and downtown Tallahassee towers in warm evening light",
    },
    seoTitle: "Tallahassee Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Tallahassee web design for firms, associations, and businesses in Florida's capital. Credible, accessible, custom-coded websites — no templates.",
    h1: "Web design & development for Tallahassee organizations",
    heroSub:
      "In the capital, credibility is currency. We build websites for the firms, associations, and businesses that work where Florida's decisions get made.",
    intro:
      "Tallahassee's web needs are shaped by what the city actually is: the seat of state government and home to two major universities. The organizations here — lobbying and law firms, trade associations, consultancies, nonprofits — sell expertise and access, and their websites get read by a more skeptical audience than most: legislators' staff, agency officials, journalists, and members deciding whether dues are worth renewing. Design flash matters less in this market than clarity, credibility, and professionalism; a site that's confusing or dated quietly undermines an organization whose entire product is being taken seriously. We build sites that pass that test — clean information architecture, accessible markup, fast pages — while also serving Tallahassee's other economy: the restaurants, services, and student-facing businesses that ride the FSU and FAMU calendar and compete in ordinary local search.",
    localContext:
      "Leon County's economy centers on state government and its orbit — associations along the Monroe corridor, law and lobbying firms near the Capitol, and agencies themselves — plus the enormous economic engine of FSU and FAMU, healthcare anchored by Tallahassee Memorial, and the local businesses of Midtown, College Town, and Market District. Organizations here often need member portals, document libraries, and event registration alongside the marketing site itself.",
    industries: [
      "associations & government affairs",
      "legal",
      "education",
      "healthcare",
    ],
    nearby: ["gainesville", "jacksonville"],
    faqs: [
      {
        q: "Do you build sites for associations and government-adjacent organizations?",
        a: "Yes — trade associations, professional societies, advocacy groups, and firms that work with the state. We handle the pieces these organizations actually need: member directories, event registration, document libraries, and news sections staff can update themselves.",
      },
      {
        q: "Can the site meet accessibility standards?",
        a: "Yes. We build with semantic, accessible markup as standard practice — which matters doubly in Tallahassee, where public-sector-adjacent organizations are often expected to meet WCAG guidelines.",
      },
      {
        q: "Our staff isn't technical. Can we still update the site ourselves?",
        a: "That's the point of our CMS setup — editing text, posting news, and updating events is a form, not code. We include training, and our Client Hub is there when you want us to handle something instead.",
      },
      {
        q: "Do you work with Tallahassee's student-facing businesses too?",
        a: "Absolutely. Restaurants, housing, fitness, and services around FSU and FAMU compete in fast-moving local search where mobile speed decides — a market we build for all the time.",
      },
    ],
    searchKeywords: [
      "tallahassee web design",
      "tallahassee website design",
      "web designer tallahassee",
      "association website",
    ],
  },

  // ── Cape Coral ─────────────────────────────────────────────────
  {
    slug: "cape-coral",
    name: "Cape Coral",
    county: "Lee County",
    region: "Southwest Florida",
    populationNote: "~220,000 residents, 400 miles of canals",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cape_Coral,_Florida",
    image: {
      src: "/locations/cape-coral.webp",
      alt: "Palm-lined waterway winding through Cape Coral",
    },
    seoTitle: "Cape Coral Website Design — Ali Samadi Agency",
    metaDescription:
      "Cape Coral website design for contractors, marine services, and local businesses riding Southwest Florida's growth. Custom-coded, fast, built to rank.",
    h1: "Website design for Cape Coral businesses",
    heroSub:
      "One of America's fastest-growing cities means a constant stream of new customers who don't know anyone yet — they're choosing businesses from Google. Be the one they find.",
    intro:
      "Cape Coral's defining fact is growth: consistently ranked among the fastest-growing cities in the nation, it fills every year with new residents who arrive knowing nobody. That demographic reality changes how business works. In an established town, plumbers and dentists live off decades of referrals; in Cape Coral, thousands of households a year are picking a contractor, a lawn service, a dentist, and a mechanic from scratch — and they're picking from their phones. The businesses that show up first with a credible, fast website are capturing customers for the next twenty years of that relationship. We build sites engineered for exactly this moment: strong local search foundations, mobile-first speed, clear calls to action, and honest pricing that fits a market where most businesses are small and watching costs.",
    localContext:
      "Lee County's boom drives construction and every trade attached to it — builders, roofers, pool companies, landscapers — plus marine services for the canal-front lifestyle (Cape Coral has more navigable canals than any city on earth), healthcare expanding to meet the retiree influx, and the restaurants and services of a city still building its downtown. Hurricane resilience is part of business here too; sites we build stay reachable when customers urgently need roofers, remediation, and repairs.",
    industries: [
      "construction & trades",
      "marine services",
      "healthcare",
      "landscaping & pools",
    ],
    nearby: ["sarasota", "st-petersburg", "port-st-lucie"],
    faqs: [
      {
        q: "Do you build websites for Cape Coral contractors?",
        a: "Constantly — trades are the backbone of this market. Contractor sites need three things: show up in local search, look trustworthy at a glance, and make calling effortless from a phone. That's the spec we build to.",
      },
      {
        q: "New residents don't know any local businesses. How do I reach them?",
        a: "They all do the same thing: search Google for '[service] near me' and judge the top results. Ranking there takes a technically sound site, a matching Google Business Profile, and pages that name the neighborhoods you serve — all part of how we build.",
      },
      {
        q: "Do you handle marine and waterfront service businesses?",
        a: "Yes — boat lifts, dock builders, detailing, charters, seawall work. With 400 miles of canals, marine services are core Cape Coral commerce, and their customers search online like everyone else.",
      },
      {
        q: "What happens to my site during hurricane season?",
        a: "Our sites are static-generated and globally distributed, so they stay online even under traffic spikes or regional outages — exactly when storm-repair businesses get their most urgent visitors.",
      },
    ],
    searchKeywords: [
      "cape coral web design",
      "cape coral website design",
      "web designer cape coral",
      "fort myers",
      "lee county",
    ],
  },

  // ── Port St. Lucie ─────────────────────────────────────────────
  {
    slug: "port-st-lucie",
    name: "Port St. Lucie",
    county: "St. Lucie County",
    region: "Treasure Coast",
    populationNote: "~240,000 residents, among the fastest-growing US cities",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Port_St._Lucie,_Florida",
    image: {
      src: "/locations/port-st-lucie.webp",
      alt: "Sailboats docked at a Port St. Lucie marina under summer clouds",
    },
    seoTitle: "Port St. Lucie Web Design — Ali Samadi Agency",
    metaDescription:
      "Port St. Lucie web design for Treasure Coast businesses. Custom-coded sites that capture the wave of new residents searching for local services.",
    h1: "Web design for Port St. Lucie businesses",
    heroSub:
      "The Treasure Coast's boomtown has more new customers than established businesses to serve them. A strong website is how you claim your share.",
    intro:
      "Port St. Lucie grew from citrus groves to a quarter-million people in two generations, and unlike Florida's legacy cities it has no entrenched old-guard business establishment — the market is genuinely up for grabs. Families relocating from South Florida and the Northeast arrive in Tradition and Torino with full shopping lists: healthcare, home services, restaurants, auto care, childcare. Meanwhile the local business supply hasn't kept pace with demand, which is why so many PSL residents still drive to Stuart or West Palm for services. For a local business, that's about the friendliest competitive math in the state — but only if people can find you. We build the websites that make that happen: fast, credible, structured to rank for Treasure Coast searches, and priced plainly for owners who'd rather invest in the business than in agency retainers.",
    localContext:
      "St. Lucie County's economy is anchored by healthcare (Cleveland Clinic's growing Tradition campus), construction and trades building the city itself, the Mets' spring-training and youth-sports economy around Clover Park, and a fast-thickening layer of restaurants, medical practices, and home services along St. Lucie West and Gatlin corridors. The customer base skews to relocated families and active retirees — audiences that research everything online before spending.",
    industries: [
      "healthcare",
      "construction & trades",
      "home services",
      "restaurants",
    ],
    nearby: ["west-palm-beach", "orlando", "fort-lauderdale"],
    faqs: [
      {
        q: "Why does a Port St. Lucie business especially need a website?",
        a: "Because your customer base is disproportionately new to town. Relocated families have no inherited word-of-mouth network — they find every service through search. In PSL, being findable online isn't marketing, it's distribution.",
      },
      {
        q: "Can you help me show up for searches across the Treasure Coast?",
        a: "Yes — many PSL businesses also serve Fort Pierce, Stuart, and Jensen Beach. We structure service-area pages properly so you rank across the region without resorting to spammy duplicate pages.",
      },
      {
        q: "Do you work with medical and healthcare practices?",
        a: "Yes. With Cleveland Clinic anchoring Tradition, healthcare is PSL's growth industry. Practice sites need clear insurance and appointment information, credibility signals, and fast mobile pages — patients are searching from their phones.",
      },
      {
        q: "How do you work with clients you never meet in person?",
        a: "Video calls plus our Client Hub — a private portal where you watch the build progress, leave feedback on live previews, and edit your own site after launch. We're in Jacksonville; distance hasn't been a problem yet.",
      },
    ],
    searchKeywords: [
      "port st lucie web design",
      "port st lucie website design",
      "treasure coast web designer",
      "fort pierce",
    ],
  },

  // ── Pembroke Pines ─────────────────────────────────────────────
  {
    slug: "pembroke-pines",
    name: "Pembroke Pines",
    county: "Broward County",
    region: "South Florida",
    populationNote: "~170,000 residents in suburban Broward",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Pembroke_Pines,_Florida",
    image: {
      src: "/locations/pembroke-pines.webp",
      alt: "Royal palms surrounding a fountain plaza in Pembroke Pines",
    },
    seoTitle: "Pembroke Pines Web Design — Ali Samadi Agency",
    metaDescription:
      "Pembroke Pines web design for family-focused businesses in suburban Broward. Custom sites that win the local searches parents make every day.",
    h1: "Web design for Pembroke Pines businesses",
    heroSub:
      "Pembroke Pines is where South Florida's families live — and family decisions start with a search. We build the sites that win pediatricians, tutors, and dinner plans.",
    intro:
      "Pembroke Pines is a city of households: one of Broward's largest suburbs, consistently rated among the best Florida cities to raise a family, laid out around schools, parks, and the shopping corridors of Pines Boulevard. Commerce here follows family logic. The searches that matter are pediatric dentist near me, youth soccer registration, math tutor, birthday party venue, family dinner — high-frequency, high-loyalty decisions where a parent picks once and returns for years. Winning those searches takes a website that loads instantly on a school-pickup-line phone, answers the practical questions (hours, location, insurance, pricing) without friction, and looks trustworthy enough to hand your kid or your evening to. That's a specific design brief, and it's one we build to often — suburban service businesses are some of the best-fit clients we have.",
    localContext:
      "The city's business landscape is classic thriving suburb: medical and dental practices clustered near Memorial Hospital West, tutoring and enrichment centers, youth sports and activity businesses, restaurants and franchises along Pines Boulevard, and home services for tens of thousands of single-family homes. Competition is real but rarely sophisticated online — most local sites are outdated templates, which makes a genuinely good one conspicuous.",
    industries: [
      "medical & dental",
      "education & tutoring",
      "family services",
      "home services",
    ],
    nearby: ["hollywood", "fort-lauderdale", "miami"],
    faqs: [
      {
        q: "What makes a website work for family-focused businesses?",
        a: "Answering a parent's questions before they have to call: hours, location, pricing, insurance, what to expect. Add fast mobile loading and visible reviews, and you've beaten most local competitors — parents choose whoever makes the decision easiest.",
      },
      {
        q: "Do you build sites for medical and dental practices?",
        a: "Yes, frequently. Practice sites need appointment requests, insurance details, provider bios, and patient-trust signals — plus the technical structure that gets you into 'near me' map results, where practices win or lose patients.",
      },
      {
        q: "I run a small local business. Is professional web design in budget?",
        a: "Our pricing is flat and public — a monthly all-inclusive plan or a one-time build. Small suburban businesses are our core clientele, and the pricing page shows exactly what you'd pay before you ever talk to us.",
      },
      {
        q: "Can you help us stand out from the franchises?",
        a: "That's where custom design earns its keep. Franchises get corporate cookie-cutter sites; an independent business with a distinctive, well-built site reads as more local and more trustworthy — which is precisely why Pines families often prefer independents.",
      },
    ],
    searchKeywords: [
      "pembroke pines web design",
      "pembroke pines website design",
      "web designer pembroke pines",
      "miramar",
    ],
  },

  // ── Hollywood ──────────────────────────────────────────────────
  {
    slug: "hollywood",
    name: "Hollywood",
    county: "Broward County",
    region: "South Florida",
    populationNote: "~153,000 residents between Miami and Fort Lauderdale",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Hollywood,_Florida",
    image: {
      src: "/locations/hollywood.webp",
      alt: "Hollywood Beach Broadwalk with palms along the Atlantic shoreline",
    },
    seoTitle: "Hollywood FL Web Design — Ali Samadi Agency",
    metaDescription:
      "Hollywood, Florida web design — custom-coded sites for beach-to-boulevard businesses competing between two major metros. No templates, honest pricing.",
    h1: "Web design for Hollywood, Florida businesses",
    heroSub:
      "Squeezed between Miami and Fort Lauderdale, Hollywood businesses compete in two metros at once. A sharp website is how you hold your ground — and take some of theirs.",
    intro:
      "Hollywood occupies a peculiar competitive position: close enough to both Miami and Fort Lauderdale that its businesses compete against both markets, yet distinct enough — the Broadwalk, the historic downtown around Young Circle, the beach neighborhoods — to have an identity and customer base of its own. That cuts two ways online. Hollywood customers can easily drift to bigger-city competitors a few exits down I-95, but Hollywood businesses can just as easily capture searches from Hallandale, Dania Beach, and Aventura if their web presence is stronger. Positioning wins that exchange, and on the web, positioning is concrete: which searches you show up for, how fast your pages load, whether your site convinces in the first five seconds. We build sites tuned for exactly that contested, borderless South Florida market — custom code, local search structure, and design that holds its own against anything Miami money is buying.",
    localContext:
      "Hollywood's economy runs from beach tourism along the Broadwalk and the Diplomat resort corridor, through the restaurants and nightlife of downtown Young Circle, to healthcare anchored by Memorial Regional — one of Florida's largest public health systems — plus marine businesses around the Intracoastal, and the aviation and logistics pull of nearby FLL. A large Latin American and Caribbean community shapes the customer base, and bilingual reach matters for many businesses here.",
    industries: [
      "tourism & hospitality",
      "healthcare",
      "restaurants & nightlife",
      "marine",
    ],
    nearby: ["fort-lauderdale", "pembroke-pines", "hialeah"],
    faqs: [
      {
        q: "Can my Hollywood business compete online with Miami and Fort Lauderdale companies?",
        a: "Yes — local search is geographic by design. For 'near me' and Hollywood-specific searches, Google prefers genuinely local businesses over big-city competitors. A technically strong site with correct local structure lets you own your territory and poach the borders.",
      },
      {
        q: "Do you work with tourism and beach-area businesses?",
        a: "Yes — hotels, vacation rentals, restaurants, water sports, and event venues along the Broadwalk corridor. These sites sell an experience, so they lean on photography and mobile speed; most of that traffic is a visitor on a phone deciding where to go next.",
      },
      {
        q: "Is bilingual content worth it for a Hollywood business?",
        a: "For most consumer-facing businesses here, yes. South Broward's Spanish-speaking population is large, and a properly built bilingual site (real pages, not auto-translation) both converts better and ranks for Spanish-language searches competitors ignore.",
      },
      {
        q: "What does the process look like?",
        a: "Kickoff call, design, build, launch — with everything visible in our Client Hub along the way. We work remotely from Jacksonville; simple sites go live in a day once the project is confirmed.",
      },
    ],
    searchKeywords: [
      "hollywood fl web design",
      "hollywood florida website design",
      "web designer hollywood fl",
      "hallandale",
      "dania beach",
    ],
  },

  // ── Gainesville ────────────────────────────────────────────────
  {
    slug: "gainesville",
    name: "Gainesville",
    county: "Alachua County",
    region: "North Central Florida",
    populationNote: "~145,000 residents, home of the University of Florida",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gainesville,_Florida",
    image: {
      src: "/locations/gainesville.webp",
      alt: "A street beneath live oaks draped in Spanish moss — classic North Florida",
    },
    seoTitle: "Gainesville Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Gainesville web design for startups, practices, and businesses in UF's orbit. Modern, custom-coded websites — built fast, priced plainly.",
    h1: "Web design & development for Gainesville businesses",
    heroSub:
      "A university town expects modern. We build the kind of fast, clean, current websites that Gainesville's students, researchers, and startup crowd take seriously.",
    intro:
      "Gainesville's audience is the youngest and most digitally fluent in Florida — tens of thousands of University of Florida students, plus the researchers, physicians, and startup founders the university attracts. This crowd has zero patience for bad websites. They notice slow load times, they notice dated design, and they bounce instantly to the next option; for student-facing businesses, the website essentially is the storefront, because discovery happens entirely through phones. At the same time, Gainesville's startup scene — seeded by UF Innovate and a steady stream of spinouts — needs credible web presences on early-stage budgets. We fit both briefs: hand-coded sites that are genuinely fast and modern, delivered quickly, at flat published prices. No bloated agency process, no retainer creep — which tends to resonate in a town that runs on grant budgets and bootstrap math.",
    localContext:
      "Alachua County's economy orbits UF and UF Health Shands — together the region's dominant employers — with a biotech and startup cluster in Progress Park and Innovation Square, student-facing commerce from Midtown to Archer Road, healthcare practices serving North Central Florida, and the restaurants and services of a town that swells and empties with the academic calendar. Businesses here often need to reach two audiences at once: transient students and rooted year-round residents.",
    industries: [
      "startups & biotech",
      "healthcare",
      "student-facing retail",
      "professional services",
    ],
    nearby: ["jacksonville", "tallahassee", "orlando"],
    faqs: [
      {
        q: "Do you work with startups and early-stage companies?",
        a: "Yes — Gainesville's UF-adjacent startup scene is a natural fit. Early-stage companies need a credible site fast and cheap: a sharp landing page that works for investors and customers now, on a codebase that can grow into a full product site later.",
      },
      {
        q: "My business depends on the student calendar. Does that change the site?",
        a: "It changes the urgency. Students decide fast and entirely on mobile, and each fall brings a fresh cohort who've never heard of you. Ranking for the searches they make in August — and loading instantly when they do — is the whole game.",
      },
      {
        q: "Can you build something more than a marketing site — like a web app?",
        a: "Yes. Custom web apps are one of our services: dashboards, booking systems, member portals, products with auth and databases. Useful for Gainesville's research spinouts that outgrow a brochure site quickly.",
      },
      {
        q: "Where are you based?",
        a: "Jacksonville — about 90 minutes northeast. We work with Gainesville clients remotely through video calls and our Client Hub, and the flat pricing on our site is exactly what you pay.",
      },
    ],
    searchKeywords: [
      "gainesville web design",
      "gainesville website design",
      "web designer gainesville fl",
      "uf startup",
      "alachua",
    ],
  },

  // ── West Palm Beach ────────────────────────────────────────────
  {
    slug: "west-palm-beach",
    name: "West Palm Beach",
    county: "Palm Beach County",
    region: "South Florida",
    populationNote: "~120,000 residents, seat of Palm Beach County",
    wikipediaUrl: "https://en.wikipedia.org/wiki/West_Palm_Beach,_Florida",
    image: {
      src: "/locations/west-palm-beach.webp",
      alt: "West Palm Beach skyline across the Intracoastal Waterway",
    },
    seoTitle: "West Palm Beach Web Design — Ali Samadi Agency",
    metaDescription:
      "West Palm Beach web design for finance, professional, and luxury-adjacent businesses. Custom-coded sites polished enough for Palm Beach County clientele.",
    h1: "Web design & development for West Palm Beach businesses",
    heroSub:
      "Wall Street moved south, and Palm Beach County's standards came with it. We build websites polished enough for the clientele this market now serves.",
    intro:
      "West Palm Beach is in the middle of a reinvention: the arrival of major finance and investment firms — the 'Wall Street South' wave along the Flagler waterfront — has pulled the city's professional standards sharply upward. The businesses that serve this ecosystem, from law practices and wealth advisors to contractors, caterers, and medical concierges, are now pitching to clients who arrived from Manhattan with Manhattan expectations. Meanwhile the county's traditional economy — luxury services for the island, healthcare for affluent retirees, marine and equestrian industries — has always demanded polish. In both cases the website is the first credential checked. We build sites that pass that check: restrained, professional design; custom code that performs; and the structural SEO that wins Palm Beach County searches where customers have money and little patience.",
    localContext:
      "Palm Beach County's business core spans the new finance cluster downtown, established legal and medical professions countywide, luxury home services and design trades serving Palm Beach island, the marine industry along the Intracoastal, equestrian commerce around Wellington, and hospitality from Clematis Street to Rosemary Square. The clientele skews affluent and discerning — referrals still matter enormously here, but every referral gets vetted online before a call is made.",
    industries: [
      "finance & professional",
      "luxury services",
      "healthcare",
      "marine & equestrian",
    ],
    nearby: ["port-st-lucie", "fort-lauderdale"],
    faqs: [
      {
        q: "Do you build sites for financial and professional firms?",
        a: "Yes — advisory firms, law practices, family offices, and the professionals who serve them. These sites are credibility documents: restrained design, flawless execution, clear positioning. We build them custom, because this audience recognizes a template.",
      },
      {
        q: "Our clients come by referral. Does the website still matter?",
        a: "In this market, especially. A Palm Beach County referral is a name someone Googles before calling. The site's job is to confirm the recommendation in thirty seconds — and a dated or generic one quietly kills warm leads you never knew you had.",
      },
      {
        q: "Do you serve businesses on Palm Beach island and Wellington too?",
        a: "Yes — the whole county. Luxury service businesses, equestrian-industry companies around Wellington, and marine businesses along the Intracoastal all face the same brief: look impeccable online for a clientele that notices details.",
      },
      {
        q: "How do you keep quality high working remotely?",
        a: "Process and visibility. Every project runs through our Client Hub — you see live previews and progress, give feedback directly on the work, and nothing launches until you've approved it. We're in Jacksonville; our standards travel fine.",
      },
    ],
    searchKeywords: [
      "west palm beach web design",
      "west palm beach website design",
      "web designer palm beach",
      "wellington",
    ],
  },

  // ── Sarasota ───────────────────────────────────────────────────
  {
    slug: "sarasota",
    name: "Sarasota",
    county: "Sarasota County",
    region: "Southwest Florida",
    populationNote: "~57,000 in the city, ~840,000 metro on the Gulf Coast",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Sarasota,_Florida",
    image: {
      src: "/locations/sarasota.webp",
      alt: "Sarasota bayfront with sailboats and the Ringling Bridge at dusk",
    },
    seoTitle: "Sarasota Web Design & Development — Ali Samadi Agency",
    metaDescription:
      "Sarasota web design with the taste this arts town expects. Custom-coded websites for Gulf Coast businesses, galleries, and professional practices.",
    h1: "Web design & development for Sarasota businesses",
    heroSub:
      "A town with an opera house, a ballet, and Ringling's legacy has opinions about design. We build websites refined enough to belong here.",
    intro:
      "Sarasota concentrates two things that shape its web market: cultural sophistication and affluent retirees. This is a town with its own opera, ballet, and orchestra, the Ringling Museum, and a gallery scene that rivals cities five times its size — its residents chose Sarasota partly for taste, and they apply that taste to every business they evaluate. They are also, overwhelmingly, online: today's Gulf Coast retirees research doctors, financial advisors, contractors, and restaurants as thoroughly as any millennial, with more money riding on their choices. The result is a market where design quality and credibility signals do unusual amounts of work. We build sites for that audience — refined rather than flashy, easy to read, fast, and structured to surface in the local searches that Sarasota and its barrier-island neighbors run every day.",
    localContext:
      "The Sarasota economy blends arts organizations and galleries downtown and around the Rosemary District, healthcare serving one of America's most retiree-rich counties, wealth management and legal practices, high-end home construction and remodeling from Siesta Key to Lakewood Ranch, and hospitality along some of the country's best-rated beaches. St. Armands Circle and Main Street retail add a walkable independent-business layer, and seasonal residents effectively double the audience each winter.",
    industries: [
      "arts & culture",
      "healthcare",
      "wealth & legal",
      "home construction",
    ],
    nearby: ["tampa", "st-petersburg", "cape-coral"],
    faqs: [
      {
        q: "Do older audiences really judge websites that harshly?",
        a: "Sarasota's do. Affluent retirees are heavy online researchers, and they equate a business's website with its competence — fair or not. Readable typography, clear navigation, and visible credentials aren't nice-to-haves for this audience; they're the sale.",
      },
      {
        q: "Do you work with arts organizations and galleries?",
        a: "Yes. Event calendars, exhibition pages, ticketing links, donor information — arts sites have real functional needs underneath the aesthetics, and in Sarasota the aesthetics genuinely matter too. It's a brief we enjoy.",
      },
      {
        q: "Our business is seasonal. How should the website handle that?",
        a: "Season is when the site earns its keep — snowbirds arriving each winter re-search for services they used last year. A CMS lets you update hours and offerings per season, and we structure pages to hold rankings year-round so you're first when the audience returns.",
      },
      {
        q: "Can you also handle our branding, not just the website?",
        a: "Yes — brand identity is one of our services. Logo, colors, and typography developed first, then a website designed around them. For Sarasota businesses competing on refinement, a coherent brand-to-site experience is worth doing properly.",
      },
    ],
    searchKeywords: [
      "sarasota web design",
      "sarasota website design",
      "web designer sarasota fl",
      "siesta key",
      "lakewood ranch",
    ],
  },
];

export const getCity = (slug: string) => cities.find((c) => c.slug === slug);

// Build-time sanity check: every `nearby` slug must reference a real city.
for (const c of cities) {
  for (const n of c.nearby) {
    if (!getCity(n)) {
      throw new Error(
        `cities.ts: "${c.slug}" lists unknown nearby slug "${n}"`
      );
    }
  }
}

// Site Inspector — fetches a client site's HTML and reports every detected
// vendor with the original snippet + IDs, so scripts can be ported to a
// rebuilt site without DevTools digging. Static HTML only: GTM-injected
// scripts won't appear individually, but the GTM container ID is detected.

export type InspectCategory =
  | "tracking"
  | "chat"
  | "search"
  | "marketing"
  | "platform"
  | "framework";

export interface InspectFinding {
  category: InspectCategory;
  name: string;
  ids: string[];
  evidence: string[];
}

export interface InspectSeo {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  keywords: string | null;
  og: { property: string; content: string }[];
  twitter: { name: string; content: string }[];
  jsonLd: { types: string[]; raw: string }[];
  favicons: string[];
  hreflang: { lang: string; href: string }[];
  /** Full <head> markup for one-click copy (capped). */
  rawHead: string;
}

export interface InspectResult {
  finalUrl: string;
  status: number;
  generator: string | null;
  seo: InspectSeo;
  findings: InspectFinding[];
  scripts: { src: string; vendor: string | null }[];
  iframes: { src: string; vendor: string | null }[];
}

interface Detector {
  name: string;
  category: InspectCategory;
  /** Matches external script/iframe/link URLs. */
  src?: RegExp;
  /** Matches inline script bodies or the raw HTML. */
  inline?: RegExp;
  /** Global regex with one capture group, run against the full HTML. */
  ids?: RegExp;
}

const DETECTORS: Detector[] = [
  // ─── Tracking & ads ────────────────────────────────────────────
  { name: "Meta Pixel", category: "tracking", src: /connect\.facebook\.net/i, inline: /\bfbq\s*\(/, ids: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{5,20})['"]/g },
  { name: "Google Tag Manager", category: "tracking", src: /googletagmanager\.com\/gtm\.js/i, inline: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/, ids: /\b(GTM-[A-Z0-9]{4,})\b/g },
  { name: "Google Analytics 4", category: "tracking", src: /googletagmanager\.com\/gtag\/js/i, inline: /gtag\s*\(/, ids: /\b(G-[A-Z0-9]{6,14})\b/g },
  { name: "Google Ads (conversion/remarketing)", category: "tracking", inline: /\bAW-\d{6,}/, ids: /\b(AW-\d{6,})\b/g },
  { name: "Universal Analytics (legacy — replace with GA4)", category: "tracking", inline: /\bUA-\d{4,}-\d+/, ids: /\b(UA-\d{4,}-\d+)\b/g },
  { name: "TikTok Pixel", category: "tracking", src: /analytics\.tiktok\.com/i, inline: /\bttq\.(load|track)/, ids: /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/g },
  { name: "LinkedIn Insight Tag", category: "tracking", src: /snap\.licdn\.com/i, inline: /_linkedin_partner_id/, ids: /_linkedin_partner_id\s*=\s*['"](\d+)['"]/g },
  { name: "Pinterest Tag", category: "tracking", src: /s\.pinimg\.com\/ct/i, inline: /\bpintrk\s*\(/, ids: /pintrk\s*\(\s*['"]load['"]\s*,\s*['"](\d+)['"]/g },
  { name: "Snap Pixel", category: "tracking", src: /sc-static\.net\/scevent/i, inline: /\bsnaptr\s*\(/ },
  { name: "Hotjar", category: "tracking", src: /static\.hotjar\.com/i, inline: /\bhjid\s*[:=]/, ids: /hjid\s*[:=]\s*(\d+)/g },
  { name: "Microsoft Clarity", category: "tracking", src: /clarity\.ms/i, inline: /clarity\s*\(|['"]clarity['"]/, ids: /clarity\.ms\/tag\/([a-z0-9]+)/gi },
  { name: "Segment", category: "tracking", src: /cdn\.segment\.com/i, inline: /analytics\.load\s*\(/ },

  // ─── Chat / customer service ───────────────────────────────────
  { name: "tawk.to", category: "chat", src: /embed\.tawk\.to/i, ids: /embed\.tawk\.to\/([a-z0-9]+)/gi },
  { name: "Tidio", category: "chat", src: /code\.tidio\.co/i, ids: /code\.tidio\.co\/([a-z0-9]+)\.js/gi },
  { name: "Intercom", category: "chat", src: /widget\.intercom\.io/i, inline: /intercomSettings|Intercom\s*\(/, ids: /app_id\s*[:=]\s*['"]([a-z0-9]+)['"]/gi },
  { name: "Crisp", category: "chat", src: /client\.crisp\.chat/i, inline: /CRISP_WEBSITE_ID/, ids: /CRISP_WEBSITE_ID\s*=\s*['"]([a-f0-9-]+)['"]/gi },
  { name: "Drift", category: "chat", src: /js\.driftt\.com/i, inline: /drift\.load\s*\(/, ids: /drift\.load\s*\(\s*['"]([a-z0-9]+)['"]/gi },
  { name: "Zendesk", category: "chat", src: /static\.zdassets\.com/i, ids: /ekr\/snippet\.js\?key=([a-f0-9-]+)/gi },
  { name: "HubSpot", category: "chat", src: /js\.hs-scripts\.com/i, ids: /js\.hs-scripts\.com\/(\d+)\.js/gi },
  { name: "Facebook Customer Chat", category: "chat", inline: /customerchat|fb-customerchat/i },
  { name: "WhatsApp widget", category: "chat", src: /wa\.me|api\.whatsapp\.com/i, inline: /wa\.me\/\d+/ },
  { name: "LiveChat", category: "chat", src: /cdn\.livechatinc\.com/i, inline: /__lc\.license/, ids: /__lc\.license\s*=\s*(\d+)/g },

  // ─── Search ────────────────────────────────────────────────────
  { name: "Algolia", category: "search", src: /cdn\.jsdelivr\.net\/npm\/(algoliasearch|instantsearch)/i, inline: /algoliasearch\s*\(/ },
  { name: "Google Custom Search", category: "search", src: /cse\.google\.com\/cse/i, ids: /cse\.google\.com\/cse\.js\?cx=([\w:]+)/g },

  // ─── Marketing / misc embeds ───────────────────────────────────
  { name: "Mailchimp", category: "marketing", src: /chimpstatic\.com|list-manage\.com/i },
  { name: "Klaviyo", category: "marketing", src: /static\.klaviyo\.com/i, ids: /company_id=([A-Za-z0-9]+)/g },
  { name: "Calendly", category: "marketing", src: /assets\.calendly\.com/i, inline: /calendly\.com\/[a-z0-9-]+/i },
  { name: "reCAPTCHA", category: "marketing", src: /google\.com\/recaptcha/i, ids: /[?&]render=([\w-]+)/g },
  { name: "Cloudflare Turnstile", category: "marketing", src: /challenges\.cloudflare\.com\/turnstile/i },
  { name: "OneTrust (cookie banner)", category: "marketing", src: /cdn\.cookielaw\.org/i },
  { name: "CookieYes (cookie banner)", category: "marketing", src: /cdn-cookieyes\.com/i },

  // ─── Platform / CMS ────────────────────────────────────────────
  { name: "WordPress", category: "platform", src: /\/wp-(content|includes)\//i, inline: /\/wp-(content|includes)\//, ids: /wp-content\/themes\/([a-z0-9_-]+)/gi },
  { name: "WooCommerce", category: "platform", src: /wp-content\/plugins\/woocommerce/i, inline: /woocommerce/i },
  { name: "Shopify", category: "platform", src: /cdn\.shopify\.com/i, inline: /Shopify\.theme|myshopify\.com/ },
  { name: "Wix", category: "platform", src: /static\.parastorage\.com/i, inline: /wix\.com|wixsite/i },
  { name: "Squarespace", category: "platform", src: /static1?\.squarespace\.com/i, inline: /squarespace/i },
  { name: "Webflow", category: "platform", src: /assets(-global)?\.website-files\.com/i, inline: /webflow/i },
  { name: "Framer", category: "platform", src: /framerusercontent\.com/i },
  { name: "GoDaddy Website Builder", category: "platform", src: /img1\.wsimg\.com/i },
  { name: "Duda", category: "platform", src: /cdn\.(website-editor\.net|dudaone)/i },

  // ─── Framework / build ─────────────────────────────────────────
  { name: "Next.js", category: "framework", src: /\/_next\//, inline: /__NEXT_DATA__/ },
  { name: "Nuxt", category: "framework", src: /\/_nuxt\//, inline: /__NUXT__/ },
  { name: "Gatsby", category: "framework", inline: /___gatsby/ },
  { name: "Astro", category: "framework", inline: /astro-island|<astro-/i },
  { name: "React", category: "framework", inline: /data-reactroot|__NEXT_DATA__|react-dom/i },
  { name: "Vue", category: "framework", inline: /data-v-app|__VUE__/ },
  { name: "jQuery", category: "framework", src: /jquery[.-]?(\d+[\d.]*)?(\.min)?\.js/i, ids: /jquery[.-](\d+\.\d+(?:\.\d+)?)/gi },
  { name: "Bootstrap", category: "framework", src: /bootstrap(\.bundle)?(\.min)?\.(js|css)/i },
];

const TAILWIND_HINT =
  /class="[^"]*\b(?:md|lg|sm|xl):[a-z][^"]*"|class="[^"]*\bflex\b[^"]*\b(?:items-center|justify-(?:between|center))\b/;

function extractAttr(tag: string, attr: string): string | null {
  const m = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
  return m?.[1] ?? null;
}

function decodeEntities(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#039;", "'");
}

function extractSeo(html: string): InspectSeo {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;

  // All <meta> tags → { name|property, content }, attribute order agnostic.
  const metas: { key: string; content: string }[] = [];
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key =
      extractAttr(tag, "name") ?? extractAttr(tag, "property") ?? null;
    const content = extractAttr(tag, "content");
    if (key && content !== null) {
      metas.push({ key: key.toLowerCase(), content: decodeEntities(content) });
    }
  }
  const meta = (key: string) =>
    metas.find((m) => m.key === key)?.content ?? null;

  const links = head.match(/<link\b[^>]*>/gi) ?? [];
  const linkBy = (rel: RegExp) =>
    links.filter((tag) => {
      const r = extractAttr(tag, "rel");
      return r !== null && rel.test(r);
    });

  const jsonLd: { types: string[]; raw: string }[] = [];
  for (const m of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    const types = [...raw.matchAll(/"@type"\s*:\s*"([^"]+)"/g)]
      .map((t) => t[1]!)
      .filter((t, i, arr) => arr.indexOf(t) === i);
    // Pretty-print for readability; keep original on parse failure.
    let pretty = raw;
    try {
      pretty = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      /* malformed JSON-LD — show as-is */
    }
    jsonLd.push({ types, raw: pretty.slice(0, 6000) });
  }

  return {
    title: decodeEntities(
      head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ""
    ) || null,
    description: meta("description"),
    canonical:
      linkBy(/^canonical$/i)
        .map((tag) => extractAttr(tag, "href"))
        .find(Boolean) ?? null,
    robots: meta("robots"),
    keywords: meta("keywords"),
    og: metas
      .filter((m) => m.key.startsWith("og:"))
      .map((m) => ({ property: m.key, content: m.content })),
    twitter: metas
      .filter((m) => m.key.startsWith("twitter:"))
      .map((m) => ({ name: m.key, content: m.content })),
    jsonLd,
    favicons: linkBy(/icon/i)
      .map((tag) => extractAttr(tag, "href"))
      .filter((h): h is string => !!h)
      .filter((h, i, arr) => arr.indexOf(h) === i),
    hreflang: linkBy(/^alternate$/i)
      .map((tag) => ({
        lang: extractAttr(tag, "hreflang") ?? "",
        href: extractAttr(tag, "href") ?? "",
      }))
      .filter((a) => a.lang && a.href),
    rawHead: head.trim().slice(0, 40_000),
  };
}

function trimAround(text: string, index: number, span = 600): string {
  const start = Math.max(0, index - span / 2);
  const chunk = text.slice(start, start + span).trim();
  return (start > 0 ? "…" : "") + chunk + (start + span < text.length ? "…" : "");
}

export async function inspectSite(rawDomain: string): Promise<InspectResult> {
  const domain = rawDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");

  const tryFetch = async (url: string) =>
    fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

  let res: Response;
  try {
    res = await tryFetch(`https://${domain}`);
  } catch {
    res = await tryFetch(`http://${domain}`);
  }

  const html = await res.text();

  // Inventory
  const scriptTags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const iframeTags = html.match(/<iframe\b[^>]*\/?>/gi) ?? [];
  const externalScripts = scriptTags
    .map((tag) => ({ tag, src: extractAttr(tag, "src") }))
    .filter((s): s is { tag: string; src: string } => !!s.src);
  const inlineScripts = scriptTags.filter((tag) => !extractAttr(tag, "src"));
  const iframes = iframeTags
    .map((tag) => ({ tag, src: extractAttr(tag, "src") }))
    .filter((s): s is { tag: string; src: string } => !!s.src);
  const generator =
    html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i)?.[1] ??
    null;

  const linkHrefs =
    html.match(/<link\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>/gi) ?? [];
  const allUrls = [
    ...externalScripts.map((s) => s.src),
    ...iframes.map((f) => f.src),
    ...linkHrefs.map((tag) => extractAttr(tag, "href") ?? ""),
  ].join("\n");
  const inlineCorpus = inlineScripts.join("\n");

  const vendorOf = new Map<string, string>(); // src -> vendor name
  const findings: InspectFinding[] = [];

  for (const d of DETECTORS) {
    const srcHit = d.src ? d.src.test(allUrls) : false;
    const inlineHit = d.inline
      ? d.inline.test(inlineCorpus) || d.inline.test(html)
      : false;
    if (!srcHit && !inlineHit) continue;

    const ids: string[] = [];
    if (d.ids) {
      for (const m of html.matchAll(d.ids)) {
        if (m[1] && !ids.includes(m[1])) ids.push(m[1]);
      }
    }

    const evidence: string[] = [];
    if (d.src) {
      for (const s of externalScripts) {
        if (d.src.test(s.src)) {
          if (evidence.length < 3) evidence.push(s.tag.slice(0, 800));
          vendorOf.set(s.src, d.name);
        }
      }
      for (const f of iframes) {
        if (d.src.test(f.src)) {
          if (evidence.length < 3) evidence.push(f.tag.slice(0, 800));
          vendorOf.set(f.src, d.name);
        }
      }
    }
    if (d.inline && evidence.length < 3) {
      for (const tag of inlineScripts) {
        const m = tag.match(d.inline);
        if (m && m.index !== undefined) {
          evidence.push(trimAround(tag, m.index));
          if (evidence.length >= 3) break;
        }
      }
    }

    findings.push({ category: d.category, name: d.name, ids, evidence });
  }

  if (TAILWIND_HINT.test(html)) {
    findings.push({
      category: "framework",
      name: "Tailwind CSS (likely)",
      ids: [],
      evidence: [],
    });
  }

  const seo = extractSeo(html);
  // Resolve relative favicon paths against the fetched page URL.
  seo.favicons = seo.favicons.map((href) => {
    try {
      return new URL(href, res.url).toString();
    } catch {
      return href;
    }
  });

  return {
    finalUrl: res.url,
    status: res.status,
    generator,
    seo,
    findings,
    scripts: externalScripts.map((s) => ({
      src: s.src,
      vendor: vendorOf.get(s.src) ?? null,
    })),
    iframes: iframes.map((f) => ({
      src: f.src,
      vendor: vendorOf.get(f.src) ?? null,
    })),
  };
}

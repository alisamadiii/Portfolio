# Sections 1–6 — Digital Marketing Strategy (Combined Transcript)

Source: Udemy "Digital Marketing Guide" — https://www.udemy.com/course/digital-marketing-guide/
Reference only. Not for the blog. Course demo product = "Smart Flow Bottle" (smart water bottle). Course teaches WordPress/WooCommerce; Ali's own stack differs (Astro/Next, Resend for email) — treat tool specifics as the course's, map concepts to Ali's client work.

## Strategy overview

Course structure: Strategy → Theory → Channels → Extras. Strategy = market research + key messages + website that converts. Real project + starter pack. (Student "Alexia" signed first client for $850 site.)

## Market Research (secs 2–5 of transcript)

- Goal: find the audience + how to talk to them. Steps: identify segments → verify → key messages.
- **Identify Audience Segments** — Google Autosuggest (incognito; set region at google.com/preferences). Type "best [product] for" (no enter). "best" = buyer intent, "for" = narrows to groups. Pick 3 segments. Demo: best water bottle for → gym, travel, hikers (skip kids/too-general "men").
- **Verify Segments** — Google Trends. Benchmark keyword = product term (e.g. "smart water bottle"); want avg ≥ 50, steady line. Segment keywords (gym/travel/hiking water bottle) compared vs benchmark; want ≥ 30. Swap keyword if weak (e.g. "outdoor water bottle").
- **Key Messages** — per segment: picture their situation → identify biggest problem → match product feature as solution → one short line. Demo (UV-C sterilization, self-cleaning, leakproof, lightweight): Gym "Clean water, no hassle. Built for your toughest workouts."; Travelers "Travel light, drink clean."; Hikers "Clean, reliable, unstoppable. Your ultimate trail companion." Client should own final wording.

## Website Building (secs 6–25 of transcript) — course uses WordPress

- Website = full control (vs social algorithms). Needs a host (course: Bluehost, affiliate) + domain (ChatGPT name ideas). Keep domain privacy.
- Install WordPress → Sydney theme + Fashion Shop starter kit (placeholders) → gives layout, pages, nav free. Log back in at /wp-admin.
- Title & Logo: set site title (SEO — Google knows brand name) + tagline (SEO) + logo (replaces title text but text stays back-end) + favicon. Logo height ~64 desktop, 40 tablet/mobile.
- Pages: delete duplicates from starter kit. Rename modern/minimal (Blog→"Explore", short slugs). Legal pages via Shopify generators: Privacy, Terms, Refunds (client's legal responsibility; templates for small biz).
- Header menu: order by importance (Shop, About, Explore); remove Home (logo does it). Sticky header, set sticky bg white. Remove scroll-to-top.
- Footer menu: least-important links bottom (Privacy, Terms, Refunds). About widget text (ChatGPT outline). Remove "Sponsored by Sydney".
- Font pairing: match industry (starter pack list). Demo Tech/Digital: Poppins (heading) + Roboto (body).
- Hero Section: MOST important. Principles: who we are / what we do / why it matters. Header + body + CTA + product image + background (with dark overlay ~0.2 for readability). Round CTA corners (border-radius 150), lighter hover. Line-height 26 on body. Min-height ~900 (NOT full-screen) — leave space to tease scroll (75% don't scroll, but teasing raises it).
- Review/Credibility Section: "As seen on" or reviews/testimonials build trust. Testimonial 7 block. Similar-length reviews for symmetry. Gray (not black) box so CTA stays dominant. Margins 80 top/bottom. Tease-scroll by sizing so a review is partly cut off.
- Themed Sections: one per audience segment; speak directly (uses key messages + problem/solution). Reverse columns on mobile so image sits on top. Remove entrance/fade animations (keep only on hero). Unify button style/spacing (copy → paste style).
- Product Section: show products with "Buy Now" (more actionable than add-to-cart for ≤3 products). Add products back-end first (image names carry product names: Canyon Sand, Graphite Black, Slate Green). Remove category label, enable Buy Now, remove Quick View.
- Mission Section: about the BRAND's mission (how it makes the world better), tied to identity + About page. Demo mission: clean drinking water for everyone. Full-screen-ish image, "Learn more" CTA.
- Store Setup (WooCommerce): business address (separate from personal), selling locations (GDPR — need a responsible person in each country you sell to; demo excludes UK), currency = most-likely customers' (USD, symbol left), metric measurements. Assign legal pages. Payments via Woo Payments (Google/Apple Pay, Visa/MC/Amex, Klarna) → Stripe account. Disable express checkout (need email for marketing).
- Shipping & Taxes: WooCommerce Shipping & Tax plugin. Enable tax rates + automated taxes (calculated at checkout by location). Shipping zones demo: Europe $9, Outside Europe $15, Free shipping ≥ $99. Business owner sets real costs.
- Product Pages: benefit-focused description; Simple Product; price/sale; inventory (stock, backorders); shipping weight/dims; linked products (upsell/cross-sell); attributes (color); keep reviews on; product image + gallery. Categorize (e.g. "Smart Flow Bottles").
- About Page: tie to Mission (brand identity + why product matters + contact). Client writes the story; you give design. Line-height 30, letter-spacing 0.2 for readability.
- Mobile Design: ~75% mobile, ~20%+ desktop, tablets tiny. Elementor device toggles change only that device. Tighten hero (negative margins to pull image up), reverse columns on mobile, shrink section min-heights, pad edges (~15).
- Safety & Optimization (Jetpack): Boost — optimize critical CSS, defer non-essential JS (can break code — test!), Image CDN. Load < 3s or bounce skyrockets. Firewall + brute-force protection. Anti-Spam Bee (free, no reCAPTCHA, GDPR-friendly). CookieYes cookie consent (connect web app).
- Checkout Test: enable test mode, test card, verify order + emails (set email base color to brand black), taxes (enable automated taxes if missing), shipping. Troubleshoot by reverting the LAST change one at a time (deferred JS broke checkout in demo → turned off).
- Go Live: WooCommerce → Site Visibility → Live.

## SEO (secs 26–29 of transcript)

- **Keyword Research** — Google Keyword Planner (ads.google.com; requires card but free; only use Keyword Planner, no ads). Discover new keywords from seeds built on audience segments (hiking/gym/travel water bottle). Set English + global (or local for local client). Want ≥ ~1,000 monthly searches. Prefer 4-word keywords (less competition; filler words like "for/of" don't count). Check difficulty with a keyword-difficulty checker — want 1–10. Demo winners: "best travel water bottle", "best gym water bottle" (4), "best hiking water bottle" (2 → chosen). One good 1–10 keyword is enough to start.
- **SEO-Friendly Content** — Post, not page. Starter-pack prompt → ChatGPT outline (keyword, product name, product description, segment, problem, solution, tone e.g. friendly/everyday). Human-edit for quality (real readers). Min 800 words (demo 806).
- **On-Page SEO** — Yoast. Focus keyphrase = keyword. Fix: outbound links (relevant, high-authority, must make sense — e.g. UV-C source), images (featured + inline; Pexels/Unsplash free, commercial-ok; only if they add value), internal links (to own articles + own product), keyphrase in first paragraph, meta description (write own via ChatGPT; keep keyword; green length), keyphrase in H2/H3 subheadings, SEO title width, image alt text with keyphrase.
- **Backlinks** = votes of confidence. Need HIGH-QUALITY: high domain authority + relevant/on-topic (off-topic links get punished). Two targets: product pages + articles.
  - Product-page backlinks: search "[product] review", find everyday review sites (not CNN), email offering a free product for an honest review + link to product page.
  - Article backlinks: search "[segment] blog [topic]", link out to a relevant (non-competing) article, notify them → they often link back.

## Email Marketing (secs 30–32 of transcript) — course uses Mailchimp (Ali uses Resend)

- **Email Setup** — professional domain email (Bluehost cPanel → Email Accounts; e.g. robin@smartflowbottle.com; first-name feels personal for small biz). Email marketing platform: Mailchimp (free < 500 subs). Connect to WooCommerce via MC4WP plugin + Mailchimp API key. Add checkout signup checkbox: NOT implicit, NOT pre-checked (GDPR), label must say "Unsubscribe anytime", double opt-in optional (off here for bigger list).
- **Capture Leads** — Mailchimp Top Bar plugin. Lead magnet = discount (e.g. "Sign up and get 15% off"). Bottom bar, neutral gray, button "Access Discount". Double opt-in REQUIRED here (bar has no consent checkbox → the confirmation email = consent). Hide bar on checkout. Create coupon (WELCOME15, 15%, no expiry). Deliver via a Thank-You page redirect (free workaround vs paid welcome email).
- **Create Email Campaign** — Mailchimp regular email, minimal layout (text always loads; images often don't — keep images minimal). Promote article/product: image at top (linked), heading, teaser paragraph + "Read more" button. Small logo linked to site. Business address required by law. Send from CUSTOM domain (Gmail/Outlook → ~95% spam). Subject line + preview text entice. Authenticate domain in Mailchimp.
  - Benchmarks (vary by industry/size): open 15–25% (low → weak subject); click ~2% (low → weak CTA); bounce < 2% (high → domain/technical issue); unsubscribe ≤ 0.5% (high → too aggressive/irrelevant).

## Google Analytics 4 (secs 33–38 of transcript)

- **Install GA4** — analytics.google.com, business Gmail. Account name = company (umbrella), property = website. Set your own country/timezone/currency (match website) for clean data. Connect via Site Kit plugin (also brings Search Console). Test in Reports → Realtime (incognito Chrome). Publish "Lifecycle" report group (Acquisition / Engagement / Monetization / Retention).
- **Connect WooCommerce** — Google Analytics for WooCommerce plugin + Measurement ID (Site Kit → Analytics). Track purchase/add-to-cart/remove events; DON'T accept incoming linker params (muddles data). Test purchase in test mode (temporarily include logged-in users). Monetization data takes 24–48h.
- **Track Leads** — double opt-in flow: signup → "Sign Up" page ("confirm your email") → confirmation email → Thank-You page (= confirmed + on list). GA4 Admin → Events → Create: custom event generate_lead when page_location contains "thank-you". (Don't use "thank-you" in other page URLs.) Shows under Engagement → Events.
- **Track Campaigns** — Campaign URL Builder: website URL (product) + source (mailchimp/facebook/…) + medium (email/…) + campaign name (cyber_monday, underscores). Shorten URL. Shows in Reports → Acquisition → Traffic Acquisition → switch to "Session Campaign" (24–48h). See sessions, engagement, key events, purchases, leads per campaign.
- **Internal Traffic Filter** — Site Kit → exclude logged-in users (enough for solo/1 client). For employees: Admin → Data Streams → Configure Tag → Define Internal Traffic (rule by IP from whatismyip.com; add each person) → Data Filters → activate (irreversible; drops that data going forward).
- **Analytics Overview** — Site Kit dashboard = daily basics + Search Console top queries (reveals which segment drives traffic). Reports:
  - Realtime = testing/launch checks.
  - Acquisition (overview + user vs traffic acquisition) = how traffic arrived (direct/organic/paid/referral/email/social).
  - Engagement → Pages & Screens = which pages/posts/products get views + engagement time (interest → sales); Landing Page = first page hit (traffic source per segment).
  - Monetization = items purchased, revenue (month/year views; aim for YoY profit growth).
  - Retention = returning users by cohort (improves with email/influencer/social campaigns + fresh content + good UX/speed).
  - User Attributes → Demographic details = which COUNTRY generates most revenue (not just most users — demo: India many users but low revenue; Canada fewer users, 10× revenue). Tailor language/design/pricing/translation to the money-making market.
  - Tech = desktop vs mobile split (demo desktop 69% — unusual; e-commerce usually ~75% mobile) → optimize where buyers actually are.
- Principle: do more of what works, less of what doesn't; focus on the users/markets generating the most revenue.

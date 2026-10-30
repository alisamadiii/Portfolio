# The lead generation offer, explained simply

Written 2026-10-21 for Ali. What changed on the agency website, what each promise means, how ads and lead tracking work, and what you must learn before you sell this.

---

## 1. The big picture in one paragraph

Before, you sold **websites**. Now you sell **customers**. A local business (a pest control company, for example) pays you every month. You run **Google Ads** so people searching "pest control near me" see that business. Those people land on a **website you built**, and they **call or fill a form**. Each call or form is a **lead**. You **count every lead**, show the owner the numbers each month, and keep improving the ads so each lead costs less.

The website is no longer the product. It is the tool that turns ad clicks into phone calls.

---

## 2. Important: what the website does NOT do

The agency website **sells** this service. It does **not** run any ads for clients and it does **not** track your clients' leads. All of that happens **outside the website**:

| Job            | Where it happens                                                                          | Who does it                   |
| -------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| Running ads    | Inside the client's **Google Ads account** (ads.google.com)                               | You, by hand                  |
| Counting calls | A **call tracking tool** (example: CallRail)                                              | Set up by you, then automatic |
| Counting forms | **Google Analytics 4 (GA4)** + Google Ads conversion tracking on the **client's** website | Set up by you, then automatic |
| Monthly report | Today: you, by hand (later: your dashboard)                                               | You                           |

So when you build a new dashboard, its job is to **pull these numbers together** in one place. See section 9.

---

## 3. What the agency website now says (and what you promised)

### The plans

| Plan                      | Price                 | What you must deliver                                                                                                                                                              |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Launch**                | $2,500/mo             | Website + hosting, **1** Google Ads campaign, manages up to **$3k/mo** of ad spend, form + GA4 tracking, home page + 1 landing page, monthly report                                |
| **Growth** (most popular) | $3,500/mo             | Everything in Launch, **several** campaigns, up to **$6k/mo** ad spend, **call tracking**, a landing page per service, **Local Services Ads** setup, a strategy call every 2 weeks |
| **Scale**                 | $4,500/mo             | Everything in Growth, unlimited campaigns, up to **$10k/mo** ad spend, landing pages per service **and** per city, **local SEO + Google Business Profile**, a weekly strategy call |
| **Website only**          |  $699 once + $25/mo   | Just a website, set up in their accounts, AI edits. **No ads.** This is your old offer                                                                                                                 |

**Rules for all growth plans (Launch, Growth, Scale):**

- **$0 setup.** The website build is included in the monthly price.
- **6-month minimum**, then month to month. Reason: Google Ads needs a few months to learn which searches turn into jobs.
- **Ad spend is NOT included.** The client pays Google directly with their own card. Your fee is only for your work.
- **The client owns everything**: their Google Ads account, domain, and website code are in their name.

### "Manages up to $3k/mo in ads": what it means

It is **the client's budget that Google charges them**, not money you receive. Example: on Launch, the client pays you $2,500 and pays Google up to $3,000. If they want to spend more than $3,000 with Google, they move up to Growth. More budget means more campaigns and more work for you, so the price goes up.

### The guarantee

**1. Lead guarantee ("hit the lead number, or walk away")**

- Before launch, you and the client agree **in writing** on a number of qualified leads for the first 90 days.
- If you miss it, the client may **cancel the 6-month minimum** and keep their website and ad account.
- You **do not refund money**. The risk is only losing the client early.

**2. On-time guarantee**

- Site and ads live within **14 days**.
- Every lead tracked.
- Monthly report by the **5th**.
- Miss any of these and **that month is free**. This one costs real money, so be careful with dates.

**What counts as a qualified lead:** a tracked phone call that lasts **60 seconds or more**, or a **real** form submission. Spam, job seekers, and existing customers don't count.

**The client's side of the deal:**

- keeps the agreed ad budget and doesn't pause the ads;
- answers calls and forms during business hours.

**How to pick the lead number (important, do this carefully):**

1. Open **Google Keyword Planner** (free, inside Google Ads → Tools).
2. Search the client's services + city (example: "pest control jacksonville").
3. Note the **cost per click** (CPC), for example $8.
4. Assume about **1 in 10 clicks becomes a lead** (10% conversion rate) for a decent landing page.
   - Cost per lead ≈ CPC ÷ 0.10 = $8 ÷ 0.10 = **$80**.
5. Leads per month = budget ÷ cost per lead = $3,000 ÷ $80 ≈ **37**.
6. 90 days ≈ 3 × 37 = **~110** forecast.
7. **Promise about half: ~55.** The first month is slower because Google is still learning, so the half gives you safety.

### Website changes, in short

- **Homepage:** "More calls, more booked jobs, more revenue". Ads first, website second.
- **Services:** grouped as _Get leads_ / _Convert them_ / _Run the business_. There is a new **Google Ads** service page.
- **About, contact, quote, blog, the 15 city pages, and the pest control, handyman and restaurants pages:** all reworded around leads.
- **Hidden for now:** past projects, reviews, the stats on the homepage and about page. You have no ad results to show yet, and we never invent numbers. Turn them back on later in `index.astro` and `about.astro` by setting the `SHOW_...` flags to `true`.
- **All prices and the guarantee text** live in one file: `apps/agency/src/data/pricing.ts`. Change it there and every page updates.

---

## 4. How a lead travels (the whole journey)

```
Person searches "pest control jacksonville" on Google
        │
        ▼
Sees the client's AD (you wrote it; Google charges the client per click)
        │  click
        ▼
Lands on the client's LANDING PAGE (you built it)
        │
        ├── Taps "Call now" ──► call goes through a TRACKING NUMBER
        │                        (call tracking tool records it, then rings the owner)
        │
        └── Fills the form ───► "thank you" → GA4 + Google Ads record a CONVERSION
        │
        ▼
You count: how many calls + forms, which keyword brought each, cost of each
        │
        ▼
Monthly report: leads, cost per lead, what you'll change next
```

---

## 5. Words you need to know (glossary)

| Word                         | Simple meaning                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Campaign**                 | A group of ads with one budget and one goal (example: "Termite treatment – Jacksonville")                                                                          |
| **Ad group**                 | A smaller group inside a campaign, with its own keywords and ads                                                                                                   |
| **Keyword**                  | The search words you pay to show up for ("termite inspection near me")                                                                                             |
| **Match type**               | How close the search must be to your keyword. **Exact** = very close, **Phrase** = contains it, **Broad** = Google guesses. Start with exact/phrase                |
| **Negative keyword**         | Words you **block** ("jobs", "free", "DIY") so you don't pay for useless clicks. Very important                                                                    |
| **Impression**               | Your ad was shown once                                                                                                                                             |
| **Click / CTR**              | Someone clicked. CTR = clicks ÷ impressions (good search CTR ≈ 5%+)                                                                                                |
| **CPC**                      | Cost per click: what Google charges for one click                                                                                                                  |
| **Conversion**               | The action you want: a call or form. You must **set this up**, or Google can't optimize                                                                            |
| **Conversion rate**          | Conversions ÷ clicks (example: 10 forms from 100 clicks = 10%)                                                                                                     |
| **CPL / CPA**                | Cost per lead = ad spend ÷ leads. **This is the number owners care about most**                                                                                    |
| **ROAS**                     | Revenue ÷ ad spend. Needs the client to tell you which leads became paying jobs                                                                                    |
| **Landing page**             | The page the ad sends people to. One service, one offer, a big call button                                                                                         |
| **Quality Score**            | Google's 1–10 grade for your keyword + ad + landing page. Higher = cheaper clicks                                                                                  |
| **Bidding strategy**         | How Google sets your price per click. Start with **Maximize clicks** or **Manual CPC**; switch to **Maximize conversions** after ~30 conversions                   |
| **LSA (Local Services Ads)** | The "Google Guaranteed" boxes at the very top. You pay **per lead**, not per click. Great for pest control, plumbers, HVAC. Needs a background check and a license |
| **Call tracking**            | A special phone number on the ad/site that records each call (length, source), then forwards to the owner                                                          |
| **GA4**                      | Google Analytics 4: counts visitors and actions on a website                                                                                                       |
| **GTM**                      | Google Tag Manager: a tool to add tracking code without editing the site each time                                                                                 |
| **gclid**                    | A code Google adds to the link when someone clicks an ad. It lets you connect a lead back to the exact click                                                       |
| **UTM**                      | Labels you add to links (`?utm_source=google`) so GA4 knows where traffic came from                                                                                |
| **Offline conversion**       | Telling Google later "this lead became a $900 job", so Google finds more people like that. Advanced                                                                |

---

## 6. Lead tracking setup, step by step (for each new client)

Do this **before** spending any ad money. Without tracking, you can't prove anything and the guarantee means nothing.

1. **Accounts in the client's name.** Create (or get access to) their Google Ads, GA4, and Google Business Profile. You are added as a manager, not the owner.
2. **GA4 on the website.** Add the GA4 tag. Your agency site already does this (`apps/agency/src/layouts/Layout.astro`), so copy the same pattern.
3. **Form conversion.** When a form is sent successfully, fire a GA4 event (`generate_lead`). Your own site already does exactly this; see `packages/google-analytics/src/client.ts`. Then, in GA4, mark `generate_lead` as a **key event**.
4. **Link Google Ads ↔ GA4** (Google Ads → Tools → Linked accounts) and **import** the `generate_lead` conversion into Google Ads.
5. **Call tracking.** Sign up for a call tracking tool. Put a tracking number on the site and in the ads ("call extension" / "call asset"). Count calls of **60 seconds or more** as conversions.
6. **Test everything.** Click your own ad link (or use preview), submit a test form, make a test call, and check that each one shows up in GA4 and in Google Ads **within a day**.
7. **Write down the lead target** (section 3) and the start date. The 90 days count from launch.

---

## 7. Launching a first campaign (simple version)

1. **One service, one city** to start (example: "termite treatment, Jacksonville").
2. **Search campaign**, not Performance Max. You get more control while learning.
3. **10–20 keywords**, exact and phrase match, that show someone **ready to buy** ("termite treatment cost", "exterminator near me"). Avoid info searches ("what do termites look like").
4. **Add negatives from day one**: jobs, salary, free, DIY, how to, course.
5. **Location**: only the area the business serves. Set it to "people **in** this location", not "interested in".
6. **Schedule**: when someone can answer the phone.
7. **Ads**: use the service + city in the headline, an offer ("Free inspection"), and a reason to trust them (years in business, reviews).
8. **Assets**: call asset (the tracking number), sitelinks, callouts.
9. **Landing page**: matches the ad exactly, call button at the top, form above the fold, reviews.
10. **Check daily the first 2 weeks**: the **Search terms** report (what people actually typed) → add bad ones as negatives.

---

## 8. Your monthly routine per client

- **Weekly:** search terms → add negatives; pause keywords that spend money with no leads; check that calls and forms are still tracking.
- **Monthly (report by the 5th):**
  - leads (calls + forms);
  - ad spend;
  - cost per lead;
  - best keywords;
  - what you changed and what's next.
- **Ask the client** which leads became paying jobs. That is how you learn the real value and can show profit later.

---

## 9. If you build a lead dashboard: what it needs

The dashboard would show each client's numbers in one place, in place of a manual report.

| Data                                                    | Where it comes from                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ad spend, clicks, CPC, conversions per campaign/keyword | **Google Ads API** (needs a developer token + manager account)                                                                             |
| Form leads, traffic sources                             | **GA4 Data API** (the repo already has `@workspace/google-analytics` for sending events)                                                   |
| Calls (number, length, source)                          | **Call tracking tool's API**                                                                                                               |
| Lead details (name, phone, message)                     | The client site's form (the same idea as `apps/api/app/api/agency/quote/route.ts`, which today emails each quote to agency@alisamadii.com) |
| "Became a job?" + job value                             | The client marks it in the dashboard (a simple won/lost button)                                                                            |

**Core screens:**

- leads this month vs. the target (the guarantee progress bar);
- cost per lead;
- a list of leads with won/lost;
- spend vs. budget.

---

## 10. What to learn today (in order)

1. **Google Skillshop: Google Ads Search certification** (skillshop.withgoogle.com). It's free and covers campaigns, keywords, bidding and Quality Score.
2. **Google Ads Help: "Set up conversion tracking"** and **"About search terms"**.
3. **GA4 basics: events and key events.** Also see how your own site does it in `packages/google-analytics/src/client.ts`.
4. **Local Services Ads**: how verification works and which industries qualify.
5. **Practice:** open a Google Ads account for **your own agency** and run a small test campaign ($10–20/day) for "web design jacksonville" or "google ads agency jacksonville". Real data from your own account is the best way to learn, and it becomes your first case study.

---

## 11. Honest notes

- **Don't take a client on Scale before you've run at least one campaign well.** Launch is the safest start.
- **Call tracking is a paid tool** and costs extra every month. Include that cost when you decide whether a plan still makes you money.
- **Never invent results** on the website. When you have real numbers (with the client's permission), turn the hidden sections back on.
- **The guarantee must also go into your client contract**, with the lead number written in.

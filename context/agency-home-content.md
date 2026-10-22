# Agency homepage content (growth partnership)

Source: https://www.alisamadii.com/ (apps/agency/src/pages/index.astro + src/html/main/home.html + src/components/GrowthPlans.astro)

- **Title:** Jacksonville Lead Generation Agency | Google Ads + Websites
- **Meta description:** More calls and booked jobs for local service businesses: managed Google Ads, a website built to convert, and every lead tracked. One monthly price.

> Notes for the redesign:
> - Copy is pulled from the rendered live page. Prices, plan names, the guarantee and FAQ come from `apps/agency/src/data/pricing.ts`, so keep reading from there instead of hardcoding them.
> - Hidden behind flags in `src/pages/index.astro` (don't bring them back): the client work section, the reviews section, and the proof strip.
> - Rules: no em dashes, no invented results, numbers or testimonials. Accent color is coral #fc8464.
> - Every "Start a Project" button goes to `/quote?plan=<id>` (launch, growth, scale, website, ecommerce, newsletter, custom). Quote success fires GA4 `generate_lead` plus the Google Ads conversion, so keep `QuoteForm.astro`.

---

<!-- nav: Main -->

[alisamadii](/)
[Services](/services)
[Work](/work)
[About](/about)
[Pricing](/pricing)
[Start a Project](/quote)

---

<!-- section -->

JACKSONVILLE LEAD GENERATION AGENCY

# More calls, more booked jobs, more revenue

We run the Google Ads that bring in local customers and build the website that turns them into booked jobs. Every lead tracked, one monthly price.

[Start a Project ↗](#contact)
[Already a customer? Open your app →](https://hub.alisamadii.com)
![Ali Samadi Agency: Google Ads, websites that convert, and email newsletters for local businesses.](/home/hero-product.png)

[button: Watch how we build [0:30]]  (opens /hero-video.mp4)

Hero chips:
- Website that converts
- Managed Google Ads
- Every lead tracked
- One partner, one price

---

<!-- section: who -->

WHO WE WORK WITH

## Sound familiar?

LOCAL SERVICE PROS

“The work is good. The phone just isn't ringing enough.”

→ We build a site made to convert and point Google Ads at it, so people searching for your service nearby find you first.

[Start a Project ↗](#contact)
ALREADY RUNNING ADS

“We pay Google every month and can't tell what we get for it.”

→ We rebuild the campaigns around searches that turn into jobs, and track every call and form back to the keyword behind it.

[Start a Project ↗](#contact)
ESTABLISHED BUSINESSES

“Our website looks fine, but it doesn't bring in work.”

→ We replace it with a site built around one goal, getting the call, and send paying traffic to it from the first month.

[Start a Project ↗](#contact)

---

<!-- section: how -->

HOW IT WORKS

## From search to booked job, one team runs it all.

- 01 Find the searches that pay We find the searches your customers actually type, then build the campaigns and write the ads. Google bills the ad spend to you directly, so you see every dollar.
- 02 Send them to a page built to convert A fast page built around one job: turning a click into a call or a booked job. A clear offer and a call button on every screen.
- 03 Track every lead, cut cost per lead monthly Every call and form is tied to the keyword that drove it. Each month we cut what isn't working, put more behind what is, and walk you through the numbers.
WHAT WE DO
[Google Ads](/services/google-ads)
[Local Services Ads](/services/google-ads)
[Email newsletters](/newsletter)
[Websites](/services/web-development)
[SEO & analytics](/services/seo-analytics)
[Shopify stores](/services/ecommerce)
[Custom web apps](/services/custom-web-apps)
[All services →](/services)

---

<!-- section: pricing -->

PRICING

## Website and Google Ads, one monthly price

No setup fee. Pick the tier that matches your ad budget. Google bills the ad spend to you directly.

### Launch

ADS UP TO $3K/MO
$2,500 /mo

For a business ready to turn on paid leads for the first time. One focused campaign, one site built to convert it.

- ✓ Custom website, hosting & care
- ✓ 1 Google Ads campaign, manages up to $3k/mo in ads
- ✓ Form & GA4 conversion tracking
- ✓ Home page + 1 landing page
- ✓ Monthly performance report
[Start a Project ↗](/quote?plan=launch)

### Growth

MOST POPULAR
$3,500 /mo

For a business with several services to sell. A landing page and campaign for each, with every call tracked.

- ✓ Everything in Launch
- ✓ Multiple campaigns, manages up to $6k/mo in ads
- ✓ Call tracking on every lead source
- ✓ A landing page for each service
- ✓ Local Services Ads setup
- ✓ Biweekly strategy call
[Start a Project ↗](/quote?plan=growth)

### Scale

ADS UP TO $10K/MO
$4,500 /mo

For a business covering several cities or locations that wants the whole local search page working for it.

- ✓ Everything in Growth
- ✓ Unlimited campaigns, manages up to $10k/mo in ads
- ✓ Landing pages per service & location
- ✓ Local SEO & Google Business Profile
- ✓ Weekly strategy call
[Start a Project ↗](/quote?plan=scale)

---

<!-- section: Our guarantee -->

OUR GUARANTEE

### Hit the lead number, or walk away

LEAD GUARANTEE · 90 DAYS

Before launch we agree in writing on how many qualified leads your campaigns should bring in. If we miss it within 90 days, cancel the 6-month minimum and keep your website and Google Ads account.

ON-TIME GUARANTEE

Site and ads live within 14 days, every lead tracked, and your report by the 5th of each month. If we miss any of these, that month is free.

A qualified lead is a tracked call of 60+ seconds or a real form inquiry. Applies to growth plans while ad spend stays at the agreed level and leads are answered in business hours.

$0 setup · Website included · 6-month minimum, then month-to-month · Ad spend paid to Google directly

Just need a website, no ads? $1,299 + $100/mo · See website plans →

---

<!-- section: faq -->

FAQ

## Common questions

**Q: What exactly do I get?**
A: More leads. We run your Google Ads so the right local searches find you, send them to a website built to turn clicks into calls, and track every lead to the keyword that drove it. We handle the campaigns, the site, hosting, and monthly reporting. You answer the phone.

**Q: Is ad spend included?**
A: No. Google bills ad spend to your card directly, so you see every dollar. Our monthly fee covers the website and managing your campaigns. Each tier covers a set amount of monthly spend: up to $3,000 on Launch, $6,000 on Growth, and $10,000 on Scale.

**Q: Why is there a 6-month minimum?**
A: Google Ads needs time to learn. The first months go into finding which searches turn into jobs, and the months after are where the cost per lead comes down. 6 months gives the campaigns a fair run. After that it's month-to-month.

**Q: What's your guarantee?**
A: Two of them. Before launch we agree in writing on how many qualified leads your campaigns should bring in. If we miss it within 90 days, cancel the 6-month minimum and keep your website and Google Ads account. And site and ads live within 14 days, every lead tracked, and your report by the 5th of each month. If we miss any of these, that month is free. A qualified lead is a tracked call of 60+ seconds or a real form inquiry. Applies to growth plans while ad spend stays at the agreed level and leads are answered in business hours.

**Q: Do I own the website?**
A: Yes. Your code lives in your own GitHub, and your domain and Google Ads account are in your name from day one. If you ever leave after the minimum term, the site and the account go with you.

**Q: What if I already have a website?**
A: We'll look at it on the first call. Usually we rebuild it, because a site built to convert makes every ad dollar go further, and the build is included in every growth plan at no extra cost.

**Q: Can I get just a website, without ads?**
A: Yes. Our website-only plan is $1,299 setup + $100/mo: custom design and build, hosting, care, and email from your own domain. You can add Google Ads later. Full details are on our Websites page.

**Q: Do you only work with Jacksonville businesses?**
A: No. We're based in Jacksonville and work with businesses across Florida, including Miami, Tampa, and Orlando, as well as anywhere in the US. Everything can be handled online.

---

<!-- section: contact -->

GET IN TOUCH

## Let's get your phone ringing

Tell us about your business and your area. We'll reply with a plan for your site and your ads.

EMAIL

[agency@alisamadii.com](mailto:agency@alisamadii.com)
SCHEDULE

[Book a Meeting ↗](https://cal.com/alisamadii)
PHONE

[+1 (971) 382-8969](tel:+19713828969)
LOCATION

Jacksonville, FL

## Get a free quote

Form fields (QuoteForm.astro):
- Name
- Email
- I'm interested in (select): Launch $2,500/mo · Growth $3,500/mo (default) · Scale $4,500/mo · Website only $1,299 + $100/mo · E-commerce storefront · Newsletter for my business: quoted · Custom / not sure yet
- Your goals (textarea), placeholder: "What do you sell, where, and how do leads come in today?"
- [button: Request a Quote]
- Success: "Thanks, we'll reply within a day." 

---

<!-- footer -->

[alisamadii](/)
Lead generation for local businesses: Google Ads, websites that convert, and email that brings customers back.

Currently taking new clients

---

<!-- nav: Footer -->

GET LEADS

[Google Ads](/services/google-ads)
[Newsletter](/newsletter)
[SEO & Analytics](/services/seo-analytics)
[Locations](/locations)
WEBSITES

[Local Business Websites](/websites)
[Web Development](/services/web-development)
[E-commerce](/ecommerce)
[UI/UX Design](/services/ui-ux-design)
[Brand Identity](/services/brand-identity)
[Custom Web Apps](/services/custom-web-apps)
[Website Management](/services/website-management)
[All services →](/services)
INDUSTRIES

[Restaurants](/restaurants)
[Handyman](/handyman)
[Pest Control](/pest-control)
COMPANY

[Home](/)
[About](/about)
[Work](/work)
[Pricing](/pricing)
[Blog](/blog)
[Docs](/docs)
[Contact](/contact)
© Ali Samadii LLC d/b/a Ali Samadi Agency · Jacksonville, FL

[Twitter](https://x.com/alisamadii_)
[GitHub](https://github.com/alisamadiii)
[LinkedIn](https://www.linkedin.com/in/alireza17/)
[Instagram](https://www.instagram.com/alisamadiillc/)
[Privacy](/privacy)
[Terms](/terms)

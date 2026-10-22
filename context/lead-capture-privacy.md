# Lead capture: privacy policy snippet for client sites

Every agency client site that runs `f.js` should have this (or similar) in its privacy policy.

> **Cookies and lead tracking**
> When you visit this site we set two first-party cookies (`_lead_attr` and `_lead_ft`) that remember how you found us: the website or search engine that sent you, the page you landed on, and any ad or campaign link you clicked (for example a Google Ads click ID). They last 90 days and are only read by this site. If you send us a message through a form, this information is saved with your message so we know which of our marketing brought you here. We don't sell it or use it to track you on other websites.

What `f.js` stores and sends, for reference:
- The referrer and landing page, with every query parameter removed except `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid` and `msclkid`.
- The time of the first visit and of the last ad click.
- The fields of forms marked `data-lead-form` (never file inputs).

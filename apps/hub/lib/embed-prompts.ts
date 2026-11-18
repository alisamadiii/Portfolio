// Plain-text prompts a client pastes into ChatGPT, Claude or Cursor together
// with their website code. Every fact mirrors apps/api/public/leads.js and
// reviews.js; keep the three in sync.

type Embed = { apiUrl: string; projectId: string };

export const leadsPrompt = ({ apiUrl, projectId }: Embed) =>
  `You are editing my website. Install the lead capture script from my hub and wire up my contact forms to it.

1. Add this tag to every page (in <head> or before </body>, same place on every page):
<script src="${apiUrl}/leads.js" data-key="${projectId}" defer></script>

2. Wire up each contact form. The script takes over any <form data-lead-form="..."> on submit: it stops the normal submit, posts every input to my hub along with the visitor's attribution (Google Ads click ids, utm_* parameters, referrer and landing page kept in first-party cookies), disables the submit button while sending, then shows a thank-you message. No per-field code is needed.

Form contract:
- data-lead-form="Contact" on the <form>. The value is the form name shown in my hub (use a different name per form, e.g. "Quote", "Footer").
- Inputs are recognised by their name attribute: name (or full_name, or first_name + last_name), email, phone (or tel), message. Any other named input still comes through and shows on the lead as an extra field, so keep inputs named.
- A hidden honeypot input named _hp. It must exist, stay empty and be hidden from people (style="display:none" tabindex="-1" autocomplete="off"). Bots fill it in and get filtered out.
- Optional on the form: data-success="..." (thank-you text), data-redirect="/thank-you" (go to a page instead of showing text), data-conversion="AW-XXXX/abc" (Google Ads conversion label; on success the script calls gtag("event", "conversion", { send_to: ... }) if gtag is on the page).
- Optional: an element with [data-lead-message] inside the form. The script writes the thank-you or error text into it. If it is missing, the script appends a <p data-lead-message role="status"> to the form.

Example:
<form data-lead-form="Contact" data-success="Thanks! We'll be in touch soon.">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" type="tel" placeholder="Phone" />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <!-- honeypot: hidden from people, bots fill it in -->
  <input name="_hp" type="text" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Send</button>
</form>

3. Only if the form already has its own validation or result UI: the script dispatches three cancelable events on the form, all bubbling. Call event.preventDefault() on one to own that step while the script still does the sending.
- lead:beforesubmit fires before the request; preventDefault() aborts the send (run validation here).
- lead:success fires on a 2xx; preventDefault() suppresses the built-in thank-you so the page shows its own.
- lead:error fires on failure; event.detail = { status, message } is the server's reason (e.g. 429 "Too many requests."); preventDefault() suppresses the built-in error so the page can show detail.message itself.
The attribution cookies, honeypot and data-conversion still work when the page owns the UI. If the form has no custom UI, leave the events alone.

Rules:
- Do not call the API endpoint directly and do not write your own fetch; the script does the POST.
- Do not rename any data-* attribute, event name or the _hp input.
- Keep the honeypot on every form.
- Style the form, inputs and message freely; the script only reads names and attributes.
- The script only works on my site's allowed domains (set in my hub under Settings), so it will not send from a random local preview URL. That is expected.

When you are done, tell me:
1. Which files you changed and where the script tag was added.
2. Each form you wired, its data-lead-form name, and the input names it sends.
3. Anything you could not wire up (a form built by a plugin, a form with no name attributes) and what I should do about it.`;

export const reviewsPrompt = ({ apiUrl, projectId }: Embed) =>
  `You are editing my website. Install the Google reviews script from my hub and show my reviews on the page.

1. Add this tag to the page that shows reviews (or once in <head> if the site uses client-side navigation such as Astro's ClientRouter; the script fills the new page again after each astro:after-swap):
<script src="${apiUrl}/reviews.js" data-key="${projectId}" defer></script>
Optional on the script tag: data-limit="6" to load fewer reviews (default 20, max 50).

2. Add the markup. The script fills it in with plain text, never HTML, and needs no JavaScript on the page:
- [data-reviews-rating] gets the Google rating, e.g. "4.9".
- [data-reviews-count] gets the total number of Google reviews, e.g. "263".
- [data-reviews-name] gets the business name.
- a[data-reviews-write] gets href = Google's "write a review" page.
- a[data-reviews-maps] gets href = the Google listing.
- <template data-review-template> is cloned once per review and each copy is inserted where the template sits. Inside it, elements carry data-review="stars" ("★★★★★" plus an aria-label), data-review="text", data-review="author", data-review="date" ("Nov 2026"; a <time> also gets a datetime attribute), data-review="photo" on an <img> (src = reviewer photo), data-review="reply" (owner reply), data-review="link" on an <a> (href = the review on Google).
- An element is removed from its copy when the value is missing (no photo, no reply, no link). A link with no URL is removed too.
- Only 5-star reviews with written text are returned, so no filtering is needed on the page.

Example markup (use it as the starting point and style it to match the site):
<p><span data-reviews-rating></span> stars from <span data-reviews-count></span> Google reviews</p>
<div class="reviews">
  <template data-review-template>
    <figure>
      <span data-review="stars"></span>
      <p data-review="text"></p>
      <figcaption><span data-review="author"></span>, <time data-review="date"></time></figcaption>
    </figure>
  </template>
</div>
<a data-reviews-write>Leave us a review</a>

3. Only if a custom layout needs it (a slider, a framework component): the data is also on window.hubReviews and in events fired on document:
- reviews:load fires once, event.detail = { business: { name, rating, totalReviews, writeReviewUrl, mapsUrl }, reviews: [{ id, author, photo, rating, text, publishedAt, reply, url }] }.
- reviews:render fires after every fill-in pass (first load, and again after a client-side page swap), same detail. Start sliders here.
- reviews:error fires with event.detail = { status, message }.
A template is only filled once (it gets data-review-rendered). If the template markup is enough, do not add any JavaScript.

Rules:
- Do not call the API endpoint directly and do not write your own fetch; the script loads the reviews.
- Do not rename any data-* attribute or event name.
- Style the markup freely (grid, cards, slider); the script only reads attributes.
- The script only works on my site's allowed domains (set in my hub under Settings), so reviews will not load on a random local preview URL. That is expected.

When you are done, tell me:
1. Which files you changed and where the script tag was added.
2. Which page and section shows the reviews, and which data-review fields the template uses.
3. Anything you could not do (a page builder that strips <template>, a slider that needs the reviews:render event) and what I should do about it.`;

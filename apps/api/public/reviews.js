/*
 * Ali Samadii LLC Google reviews.
 * <script src="https://api.alisamadii.com/reviews.js" data-key="PROJECT_ID" defer></script>
 * data-key is the project's projectId (shown in the Hub, Google Reviews app);
 * reads /api/agency/reviews/<projectId>. Only the project's own domains are
 * allowed to read it.
 *
 * Optional script attribute:
 *   data-limit="6"   how many reviews to load (default 20, max 50)
 *
 * Fill-in markup (no JavaScript needed on the page). Text is always set as
 * plain text, never HTML.
 *   <span data-reviews-rating></span>        "4.9"
 *   <span data-reviews-count></span>         "263"
 *   <span data-reviews-name></span>          business name
 *   <a data-reviews-write>Review us</a>      href = Google "write a review"
 *   <a data-reviews-maps>See on Google</a>   href = the Google listing
 *   <div>
 *     <template data-review-template>
 *       <figure>
 *         <img data-review="photo" alt="" />  src = reviewer photo (removed if none)
 *         <p data-review="text"></p>
 *         <span data-review="author"></span>
 *         <span data-review="stars"></span>  "★★★★★"
 *         <time data-review="date"></time>   "Nov 2026" (+ datetime attribute)
 *         <p data-review="reply"></p>        owner reply (removed if none)
 *         <a data-review="link">Read on Google</a>
 *       </figure>
 *     </template>
 *   </div>
 * Each review is a copy of the template, inserted where the template sits.
 *
 * Custom rendering: the data is also on window.hubReviews and in events
 * fired on document:
 *   reviews:load    once, event.detail = { business: { name, rating,
 *                   totalReviews, writeReviewUrl, mapsUrl }, reviews: [{ id,
 *                   author, photo, rating, text, publishedAt, reply, url }] }
 *   reviews:render  after every fill-in pass (first load, and again after a
 *                   client-side page swap), same detail; start sliders here
 *   reviews:error   event.detail = { status, message }
 *
 * Sites with client-side navigation (Astro's ClientRouter) can load the script
 * once in <head>: it fills the new page again after each astro:after-swap.
 * A template is only filled once (it gets data-review-rendered).
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-key");
  if (!key) return;
  var limit = script.getAttribute("data-limit");
  var endpoint =
    new URL(script.src).origin +
    "/api/agency/reviews/" +
    encodeURIComponent(key) +
    (limit ? "?limit=" + encodeURIComponent(limit) : "");

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function each(selector, fn, root) {
    var nodes = (root || document).querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
  }

  function setLink(el, url) {
    if (url) el.setAttribute("href", url);
    else el.parentNode && el.parentNode.removeChild(el);
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function fillReview(root, review) {
    each("[data-review]", function (el) {
      var field = el.getAttribute("data-review");
      if (field === "photo") {
        if (review.photo) el.setAttribute("src", review.photo);
        else el.parentNode.removeChild(el);
      } else if (field === "link") {
        setLink(el, review.url);
      } else if (field === "stars") {
        el.textContent = new Array(review.rating + 1).join("★");
        el.setAttribute("aria-label", review.rating + " out of 5 stars");
      } else if (field === "date") {
        el.textContent = formatDate(review.publishedAt);
        if (el.tagName === "TIME") el.setAttribute("datetime", review.publishedAt);
      } else if (field === "reply") {
        if (review.reply) el.textContent = review.reply;
        else el.parentNode.removeChild(el);
      } else if (field === "author" || field === "text") {
        el.textContent = review[field] || "";
      }
    }, root);
  }

  function render(data) {
    var b = data.business || {};
    each("[data-reviews-rating]", function (el) {
      el.textContent = b.rating != null ? Number(b.rating).toFixed(1) : "";
    });
    each("[data-reviews-count]", function (el) {
      el.textContent = b.totalReviews != null ? String(b.totalReviews) : "";
    });
    each("[data-reviews-name]", function (el) {
      el.textContent = b.name || "";
    });
    each("a[data-reviews-write]", function (el) {
      setLink(el, b.writeReviewUrl);
    });
    each("a[data-reviews-maps]", function (el) {
      setLink(el, b.mapsUrl);
    });
    each("template[data-review-template]:not([data-review-rendered])", function (tpl) {
      tpl.setAttribute("data-review-rendered", "");
      var reviews = data.reviews || [];
      for (var i = 0; i < reviews.length; i++) {
        var copy = tpl.content.cloneNode(true);
        fillReview(copy, reviews[i]);
        tpl.parentNode.insertBefore(copy, tpl);
      }
    });
    emit("reviews:render", data);
  }

  fetch(endpoint, { credentials: "omit" })
    .then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw { status: res.status, message: (body && body.error) || "Request failed" };
        return body;
      });
    })
    .then(function (data) {
      window.hubReviews = data;
      // Fill in once the page is parsed (the script may sit in <head>).
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { render(data); });
      } else {
        render(data);
      }
      document.addEventListener("astro:after-swap", function () { render(data); });
      emit("reviews:load", data);
    })
    .catch(function (err) {
      var detail = err && err.status ? err : { status: 0, message: "Network error" };
      if (window.console) console.warn("[reviews.js]", detail.message);
      emit("reviews:error", detail);
    });
})();

/*
 * Ali Samadii LLC lead capture.
 * <script src="https://api.alisamadii.com/f.js" data-key="FORM_KEY" defer></script>
 *
 * - Keeps Google Ads click IDs (gclid/gbraid/wbraid), utm_*, the outside
 *   referrer and the landing page in a 90-day first-party cookie (last touch),
 *   plus the very first visit in a second one, so they survive page changes.
 * - Takes over every <form data-lead-form>: posts its fields plus that
 *   attribution to the Hub, then shows a thank-you message.
 *
 * Optional form attributes:
 *   data-lead-form="Contact"     form name shown in the Hub
 *   data-success="Thanks!"       message shown after submit
 *   data-redirect="/thank-you"   go here after submit instead
 *   data-conversion="AW-1/abc"   gtag conversion to fire on success
 * A hidden input named "_hp" works as a spam honeypot.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-key");
  if (!key) return;
  var endpoint = new URL(script.src).origin + "/api/agency/forms/" + encodeURIComponent(key);

  var COOKIE = "_lead_attr"; // last touch: click IDs, utm, referrer, landing page
  var FIRST = "_lead_ft"; // first visit ever: referrer, landing page, time
  var MAX_AGE = 60 * 60 * 24 * 90;
  var PARAMS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var CLICK_IDS = ["gclid", "gbraid", "wbraid"];
  // Only these query params are kept on stored URLs; others can hold personal data.
  var KEPT = PARAMS.concat("fbclid", "msclkid");
  var loadedAt = Date.now();

  function strip(url) {
    try {
      var u = new URL(url);
      var kept = new URLSearchParams();
      u.searchParams.forEach(function (v, k) {
        if (KEPT.indexOf(k.toLowerCase()) !== -1) kept.append(k, v);
      });
      var q = kept.toString();
      return (u.origin + u.pathname + (q ? "?" + q : "")).slice(0, 1000);
    } catch (e) {
      return "";
    }
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return null;
    }
  }

  function writeCookie(name, value) {
    document.cookie =
      name + "=" + encodeURIComponent(JSON.stringify(value)) +
      "; max-age=" + MAX_AGE + "; path=/; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
  }

  // Referrer from another site; internal navigation doesn't count.
  var referrer = "";
  try {
    if (document.referrer && new URL(document.referrer).host !== location.host) {
      referrer = strip(document.referrer);
    }
  } catch (e) {}
  var landing = strip(location.href);
  var now = new Date().toISOString();

  if (!readCookie(FIRST)) writeCookie(FIRST, { referrer: referrer, landing: landing, at: now });

  var query = new URLSearchParams(location.search);
  var tagged = {};
  PARAMS.forEach(function (p) {
    var v = query.get(p);
    if (v) tagged[p] = v.slice(0, 500);
  });
  var current = readCookie(COOKIE);

  if (Object.keys(tagged).length) {
    // A tagged visit (ad click, campaign link) replaces the last touch.
    tagged.landing = landing;
    tagged.referrer = referrer;
    if (CLICK_IDS.some(function (id) { return tagged[id]; })) tagged.clickAt = now;
    writeCookie(COOKIE, tagged);
  } else if (referrer || !current) {
    // A visit from another site (search, social, a link) becomes the last touch,
    // but an ad click from the last 90 days stays credited, like Google Ads does.
    var next = { landing: landing, referrer: referrer };
    if (current) {
      CLICK_IDS.concat("clickAt").forEach(function (k) {
        if (current[k]) next[k] = current[k];
      });
    }
    writeCookie(COOKIE, next);
  }

  function showMessage(form, text, isError) {
    var el = form.querySelector("[data-lead-message]");
    if (!el) {
      el = document.createElement("p");
      el.setAttribute("data-lead-message", "");
      el.setAttribute("role", "status");
      form.appendChild(el);
    }
    el.textContent = text;
    el.style.color = isError ? "#c0392b" : "";
  }

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-lead-form")) return;
      event.preventDefault();
      if (form.getAttribute("data-lead-sending")) return;

      var fields = {};
      var hp = "";
      new FormData(form).forEach(function (value, name) {
        if (typeof value !== "string") return; // skip file inputs
        if (name === "_hp") hp = value;
        else if (fields[name]) fields[name] += ", " + value; // checkboxes
        else fields[name] = value;
      });

      var attr = readCookie(COOKIE) || {};
      var first = readCookie(FIRST);
      var payload = {
        fields: fields,
        formName: form.getAttribute("data-lead-form") || form.getAttribute("name") || undefined,
        pageUrl: strip(location.href),
        landingPage: attr.landing || undefined,
        referrer: (attr.referrer || "").slice(0, 2000) || undefined,
        firstTouch: first || undefined,
        clickAt: attr.clickAt || undefined,
        gclid: attr.gclid,
        gbraid: attr.gbraid,
        wbraid: attr.wbraid,
        utm: {
          source: attr.utm_source,
          medium: attr.utm_medium,
          campaign: attr.utm_campaign,
          term: attr.utm_term,
          content: attr.utm_content,
        },
        hp: hp || undefined,
        t: Date.now() - loadedAt,
      };

      var button = form.querySelector('[type="submit"]');
      form.setAttribute("data-lead-sending", "1");
      if (button) button.disabled = true;

      // text/plain keeps this a simple CORS request (no preflight).
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));

          var conversion = form.getAttribute("data-conversion");
          if (conversion && typeof window.gtag === "function") {
            window.gtag("event", "conversion", { send_to: conversion });
          }
          form.dispatchEvent(new CustomEvent("lead:success", { bubbles: true }));

          var redirect = form.getAttribute("data-redirect");
          if (redirect) {
            location.href = redirect;
            return;
          }
          form.reset();
          showMessage(form, form.getAttribute("data-success") || "Thanks! We'll be in touch soon.", false);
        })
        .catch(function () {
          showMessage(form, "Something went wrong. Please try again or call us.", true);
        })
        .finally(function () {
          form.removeAttribute("data-lead-sending");
          if (button) button.disabled = false;
        });
    },
    true
  );
})();

/*
 * Ali Samadii LLC lead capture.
 * <script src="https://api.alisamadii.com/f.js" data-key="FORM_KEY" defer></script>
 *
 * - Keeps Google Ads click IDs (gclid/gbraid/wbraid) and utm_* from the landing
 *   URL in a 90-day first-party cookie, so they survive page changes.
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

  var COOKIE = "_lead_attr";
  var PARAMS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  function readCookie() {
    var match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    if (!match) return {};
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return {};
    }
  }

  // A new ad click replaces the old attribution; plain visits keep it.
  var query = new URLSearchParams(location.search);
  var fresh = {};
  PARAMS.forEach(function (p) {
    var v = query.get(p);
    if (v) fresh[p] = v.slice(0, 500);
  });
  if (Object.keys(fresh).length) {
    fresh.landing = location.href.slice(0, 1000);
    fresh.referrer = document.referrer.slice(0, 1000);
    document.cookie =
      COOKIE + "=" + encodeURIComponent(JSON.stringify(fresh)) +
      "; max-age=" + 60 * 60 * 24 * 90 + "; path=/; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
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

      var attr = readCookie();
      var payload = {
        fields: fields,
        formName: form.getAttribute("data-lead-form") || form.getAttribute("name") || undefined,
        pageUrl: location.href.slice(0, 2000),
        referrer: (attr.referrer || document.referrer || "").slice(0, 2000) || undefined,
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

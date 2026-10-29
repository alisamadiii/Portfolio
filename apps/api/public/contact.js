/*
 * Ali Samadii LLC contact email.
 * <script src="https://api.alisamadii.com/contact.js" data-key="PROJECT_ID" defer></script>
 * data-key is the project's projectId (shown in the Hub); posts to
 * /api/agency/contact/<projectId>.
 *
 * - Takes over every <form data-contact-form>: posts its fields to the Hub,
 *   which sends the site owner a contact email through the project's own
 *   sending address. Every send shows up in the project's Emails view.
 * - Unlike leads.js (lead capture + ad attribution), this only sends an email:
 *   no cookies, no tracking.
 *
 * Optional form attributes:
 *   data-contact-form="Contact"   form name shown in the email
 *   data-success="Thanks!"        message shown after submit
 *   data-redirect="/thank-you"    go here after submit instead
 * A hidden input named "_hp" works as a spam honeypot.
 *
 * Lifecycle events (all bubble and are cancelable) let a page keep its own
 * validation and result UI while the script still does the sending:
 *   contact:beforesubmit   fires before the request; preventDefault() aborts the send
 *   contact:success        fires on a 2xx; preventDefault() suppresses the built-in thank-you
 *   contact:error          fires on failure; event.detail = { status, message } (the server's
 *                          reason, e.g. 429 "Too many requests."); preventDefault() suppresses
 *                          the built-in error so the page can show detail.message itself
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-key");
  if (!key) return;
  var endpoint =
    new URL(script.src).origin + "/api/agency/contact/" + encodeURIComponent(key);
  var loadedAt = Date.now();

  function showMessage(form, text, isError) {
    var el = form.querySelector("[data-contact-message]");
    if (!el) {
      el = document.createElement("p");
      el.setAttribute("data-contact-message", "");
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
      if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-contact-form"))
        return;
      event.preventDefault();
      if (form.getAttribute("data-contact-sending")) return;

      // Host page can validate first; preventDefault() on this event aborts the send.
      if (!form.dispatchEvent(new CustomEvent("contact:beforesubmit", { bubbles: true, cancelable: true })))
        return;

      var fields = {};
      var hp = "";
      new FormData(form).forEach(function (value, name) {
        if (typeof value !== "string") return; // skip file inputs
        if (name === "_hp") hp = value;
        else if (fields[name]) fields[name] += ", " + value; // checkboxes
        else fields[name] = value;
      });

      var payload = {
        fields: fields,
        formName:
          form.getAttribute("data-contact-form") ||
          form.getAttribute("name") ||
          undefined,
        pageUrl: location.href.slice(0, 2000),
        hp: hp || undefined,
        t: Date.now() - loadedAt,
      };

      var button = form.querySelector('[type="submit"]');
      form.setAttribute("data-contact-sending", "1");
      if (button) button.disabled = true;

      // The server's reason (status + message) is handed to the page via the event's detail.
      function fail(status, message) {
        var detail = { status: status || 0, message: message || "" };
        // preventDefault() on this event suppresses the built-in error message.
        if (form.dispatchEvent(new CustomEvent("contact:error", { bubbles: true, cancelable: true, detail: detail })))
          showMessage(form, message || "Something went wrong. Please try again or call us.", true);
      }

      // text/plain keeps this a simple CORS request (no preflight).
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(function (res) {
          if (res.ok) {
            // preventDefault() on this event suppresses the built-in thank-you so the page can show its own.
            var handled = !form.dispatchEvent(
              new CustomEvent("contact:success", { bubbles: true, cancelable: true })
            );
            var redirect = form.getAttribute("data-redirect");
            if (redirect) {
              location.href = redirect;
              return;
            }
            form.reset();
            if (!handled)
              showMessage(
                form,
                form.getAttribute("data-success") || "Thanks! Your message has been sent.",
                false
              );
            return;
          }
          // Non-2xx: read the server's reason (JSON { error }) and hand it to the page.
          return res.text().then(function (body) {
            var message = "";
            try { message = (JSON.parse(body) || {}).error || ""; } catch (e) {}
            fail(res.status, message);
          });
        })
        .catch(function () {
          // Network failure or no response at all.
          fail(0, "");
        })
        .finally(function () {
          form.removeAttribute("data-contact-sending");
          if (button) button.disabled = false;
        });
    },
    true
  );
})();

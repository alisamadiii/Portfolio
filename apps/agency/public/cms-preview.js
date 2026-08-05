/**
 * CMS live-preview bridge.
 *
 * Loaded ONLY when the page URL carries `?cms-preview=1` (the CMS iframe adds
 * it), so normal visitors never run this. Listens for the CMS `postMessage`
 * when a field input is focused, then scrolls to and highlights the element
 * whose `data-cms-field` matches the focused field's dot-path.
 *
 * The field path, the JSON key path, and the `data-cms-field` value are the
 * same string (e.g. `hero.heading`) — that alignment is what makes this work
 * with no mapping layer.
 */
(function () {
  var HIGHLIGHT_CLASS = "cms-preview-highlight";
  var STYLE_ID = "cms-preview-style";
  var current = null;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "." +
      HIGHLIGHT_CLASS +
      "{outline:2px solid #6366f1;outline-offset:3px;border-radius:2px;" +
      "animation:cms-preview-pulse 1.2s ease-out;}" +
      "@keyframes cms-preview-pulse{0%{box-shadow:0 0 0 0 rgba(99,102,241,.5);}" +
      "100%{box-shadow:0 0 0 14px rgba(99,102,241,0);}}";
    document.head.appendChild(style);
  }

  function esc(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : value;
  }

  function clear() {
    if (current) {
      current.classList.remove(HIGHLIGHT_CLASS);
      current = null;
    }
  }

  function resolve(field) {
    if (!field) return null;
    var el = document.querySelector('[data-cms-field="' + esc(field) + '"]');
    if (el) return el;
    // Prefix fallback: focusing `hero.cta.link` highlights the `hero.cta` element.
    var parts = field.split(".");
    while (parts.length > 1) {
      parts.pop();
      el = document.querySelector(
        '[data-cms-field="' + esc(parts.join(".")) + '"]'
      );
      if (el) return el;
    }
    // Child fallback: focusing an object highlights its first tagged descendant.
    return document.querySelector('[data-cms-field^="' + esc(field) + '."]');
  }

  function highlight(field) {
    var el = resolve(field);
    clear();
    if (!el) return;
    injectStyle();
    el.classList.remove(HIGHLIGHT_CLASS);
    void el.offsetWidth; // reflow so the pulse restarts on re-focus
    el.classList.add(HIGHLIGHT_CLASS);
    current = el;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "cms-field-focus") return;
    highlight(data.field);
  });

  function announce() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "cms-preview-ready" }, "*");
    }
  }
  if (document.readyState !== "loading") announce();
  else window.addEventListener("DOMContentLoaded", announce);
})();

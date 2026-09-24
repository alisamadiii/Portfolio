/**
 * cms-bridge browser overlay. Injected inline on every page by the framework
 * adapter. Inert until the page is opened with `?cms-edit` (or `?cms-edit=<token>`),
 * which flags the session. Then: a cursor box morphs around editable elements;
 * clicking one opens a popover where the client describes a change, which is
 * POSTed to the content-pilot intake endpoint to create an edit job.
 *
 * The real security boundary is the server-side origin whitelist on the intake
 * endpoint — the `token` here is only UX gating for turning edit mode on.
 */

interface CmsBridgeConfig {
  project?: string;
  endpoint?: string;
  repoId?: number;
  branch?: string;
}

declare global {
  interface Window {
    __CMS_BRIDGE__?: CmsBridgeConfig;
    __cmsBridgeBound?: boolean;
  }
}

(function () {
  const CFG: CmsBridgeConfig = window.__CMS_BRIDGE__ || {};
  // Obscure, non-obvious activation param — a random visitor won't stumble on
  // it, and the value is the intake token (real auth is server-side).
  const EDIT_PARAM = "e7k9x2fq";
  // sessionStorage key holding the intake token for this edit session.
  const TOKEN_KEY = "cms-bridge-token";
  const EDITABLE =
    "h1,h2,h3,h4,h5,h6,p,span,a,button,img,li,blockquote,figcaption," +
    "label,input:not([type=hidden]):not([aria-hidden=true]),textarea";
  // Accent is a fixed brand blue for the overlay — never read from the host
  // site, so the ring/border/cursor look identical across every client.
  const ACCENT = "#4f7fff";

  // ---------- activation ----------
  // The hub opens the iframe with `?<EDIT_PARAM>=<token>`. We stash the token in
  // sessionStorage (survives in-site navigation, dies with the tab, never in the
  // built bundle) and immediately strip it from the URL so it doesn't linger in
  // history or referer.
  try {
    const params = new URLSearchParams(location.search);
    if (params.has(EDIT_PARAM)) {
      const token = params.get(EDIT_PARAM) || "";
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      params.delete(EDIT_PARAM);
      const qs = params.toString();
      history.replaceState(
        null,
        "",
        location.pathname + (qs ? "?" + qs : "") + location.hash
      );
    }
  } catch {
    /* sessionStorage/URL may be unavailable — stay inert */
  }

  const getToken = (): string => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  };

  const active = () => getToken() !== "";

  if (!active()) return;

  // ---------- payload ----------

  function sourceRefFor(el: Element): string {
    const srcEl = el.closest("[data-cms-src]");
    return srcEl ? srcEl.getAttribute("data-cms-src") || "" : "";
  }

  function elementTextFor(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (tag === "img") {
      const img = el as HTMLImageElement;
      return `image src="${img.getAttribute("src") || ""}" alt="${img.getAttribute("alt") || ""}"`;
    }
    if (tag === "input" || tag === "textarea") {
      const f = el as HTMLInputElement | HTMLTextAreaElement;
      return (
        f.value ||
        f.getAttribute("placeholder") ||
        ""
      );
    }
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Shared intake POST. Returns the created job (`{ id, status }`) so callers
  // can notify the hub (edit-submitted postMessage) with the job id.
  async function postIntake(
    body: Record<string, unknown>
  ): Promise<{ id?: number; status?: string }> {
    const endpoint = (CFG.endpoint || "").replace(/\/+$/, "");
    if (!endpoint) {
      throw new Error("No endpoint configured in the cms-bridge integration.");
    }
    const token = getToken();
    if (!token) {
      throw new Error("Edit session token missing — reopen from the editor.");
    }
    if (!CFG.repoId) {
      throw new Error("Site is missing repoId in its cms-bridge config.");
    }
    let res: Response;
    try {
      res = await fetch(endpoint + "/api/v1/intake", {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ repoId: CFG.repoId, ...body }),
      });
    } catch (e) {
      // Network / CORS failures never reach the response stage.
      const msg = e instanceof Error ? e.message : "request failed";
      throw new Error(
        `Could not reach ${endpoint} (${msg}). Check the endpoint is up and reachable (CORS).`
      );
    }
    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.clone().json();
        detail = data?.error ? String(data.error) : JSON.stringify(data);
      } catch {
        try {
          detail = (await res.text()).slice(0, 300);
        } catch {
          /* ignore */
        }
      }
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  // Tell the hub (when framed) that a request was created so it can refresh
  // its jobs list immediately instead of waiting for the next poll.
  function notifySubmitted(jobId?: number): void {
    if (window.parent === window) return;
    try {
      window.parent.postMessage(
        { cms: 1, v: 2, type: "edit-submitted", jobId },
        "*"
      );
    } catch {
      /* ignore */
    }
  }

  // ---------- overlay DOM ----------

  let dot: HTMLDivElement,
    chip: HTMLDivElement,
    bar: HTMLDivElement,
    popover: HTMLDivElement | null = null;
  let chipTimer: ReturnType<typeof setTimeout>;

  function showChip(ok: boolean, label?: string) {
    chip.innerHTML = ok
      ? chip.dataset.tick + "<span>" + (label || "Sent") + "</span>"
      : "<span>" + (label || "Failed") + "</span>";
    chip.style.left = mouse.x + 14 + "px";
    chip.style.top = mouse.y + 14 + "px";
    chip.classList.remove("in", "out");
    void chip.offsetWidth; // restart animation
    chip.classList.add("in");
    clearTimeout(chipTimer);
    chipTimer = setTimeout(
      function () {
        chip.classList.remove("in");
        chip.classList.add("out");
      },
      ok ? 1400 : 1800
    );
  }

  function makeOverlay() {
    if (document.getElementById("cms-bridge-dot")) return;

    const base =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:2147483646;" +
      "will-change:transform,width,height;";

    dot = document.createElement("div");
    dot.id = "cms-bridge-dot";
    dot.style.cssText =
      base +
      "width:10px;height:10px;border-radius:50%;background:" +
      ACCENT +
      ";border:2px solid " +
      ACCENT +
      ";box-sizing:border-box;opacity:1;transition:background .18s ease,opacity .15s ease;";

    const style = document.createElement("style");
    style.id = "cms-bridge-style";
    style.textContent =
      "@keyframes cmsChipIn{0%{opacity:0;filter:blur(6px);scale:.6}" +
      "60%{opacity:1;filter:blur(0);scale:1.08}100%{opacity:1;filter:blur(0);scale:1}}" +
      "@keyframes cmsChipOut{to{opacity:0;filter:blur(4px);scale:.85}}" +
      "@keyframes cmsTick{to{stroke-dashoffset:0}}" +
      "@keyframes cmsPopIn{from{opacity:0;scale:.9}to{opacity:1;scale:1}}" +
      // Edit mode: nothing on the page is text-selectable (so marquee-dragging
      // never highlights text) — except inside our own popover.
      "body{-webkit-user-select:none;user-select:none}" +
      "#cms-bridge-popover,#cms-bridge-input,#cms-bridge-branch,#cms-bridge-page-image{-webkit-user-select:text;user-select:text}" +
      "#cms-bridge-chip.in{animation:cmsChipIn .28s cubic-bezier(.34,1.56,.64,1) forwards}" +
      "#cms-bridge-chip.in svg path{animation:cmsTick .25s ease-out .08s forwards}" +
      "#cms-bridge-chip.out{animation:cmsChipOut .18s ease-in forwards}" +
      // Focus ring + primary border on the textarea, matching the hub input.
      "#cms-bridge-input,#cms-bridge-branch,#cms-bridge-page-image{transition:border-color .15s ease,box-shadow .15s ease}" +
      // White focus ring — the popovers themselves are accent-blue, so the
      // accent ring would vanish. !important beats the inline border.
      "#cms-bridge-input:focus,#cms-bridge-branch:focus,#cms-bridge-page-image:focus{border-color:#fff" +
      " !important;box-shadow:0 0 0 3px rgba(255,255,255,.35)" +
      " !important}" +
      // Dialog (expanded) mode: everything a notch bigger. !important beats the
      // inline `font:` shorthands.
      ".cms-expanded{font-size:15px !important}" +
      ".cms-expanded .cmsb-title{font-size:16px !important}" +
      ".cms-expanded .cmsb-muted{font-size:13px !important}" +
      ".cms-expanded textarea,.cms-expanded input{font-size:15px !important;line-height:1.5 !important}" +
      ".cms-expanded button{font-size:13px !important}" +
      ".cms-expanded #cms-bridge-error{font-size:13px !important}";
    document.head.appendChild(style);

    chip = document.createElement("div");
    chip.id = "cms-bridge-chip";
    chip.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:2147483647;" +
      "background:#111;color:#fff;font:12px/1 system-ui,sans-serif;" +
      "padding:6px 10px;border-radius:999px;opacity:0;transform-origin:top left;" +
      "display:flex;align-items:center;gap:6px;";
    const TICK =
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
      '<path d="M2 6.5L4.8 9.3L10 3.5" stroke="#7CFFA0" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" ' +
      'stroke-dasharray="12" stroke-dashoffset="12"/></svg>';
    chip.dataset.tick = TICK;
    chip.innerHTML = TICK + "<span>Sent</span>";

    bar = document.createElement("div");
    bar.id = "cms-bridge-bar";
    bar.style.cssText =
      "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;background:#111;color:#fff;width:max-content;" +
      "font:13px/1 system-ui,sans-serif;padding:10px 16px;" +
      "border-radius:24px;box-shadow:0 4px 16px rgba(0,0,0,.25);" +
      "display:flex;gap:12px;align-items:center;";
    bar.innerHTML =
      "<span>Edit mode — click any text or image to request a change · ⌘-click to follow links</span>" +
      '<button id="cms-bridge-exit" style="background:#fff;border:1px solid #fff;' +
      "color:#111;border-radius:999px;padding:4px 12px;" +
      'font:12px/1 system-ui,sans-serif;cursor:pointer">Exit</button>';

    // Round chat launcher, bottom-right — page-level requests ("add an event",
    // "write a blog post") for clients who don't think in click-an-element.
    const launcher = document.createElement("button");
    launcher.id = "cms-bridge-launcher";
    launcher.setAttribute("aria-label", "Request a change to this page");
    launcher.style.cssText =
      "position:fixed;bottom:16px;right:16px;width:72px;height:72px;" +
      "z-index:2147483647;pointer-events:auto;background:" +
      ACCENT +
      ";color:#fff;border:none;border-radius:50%;cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.3);" +
      "transition:transform .15s ease,box-shadow .15s ease;";
    launcher.innerHTML =
      '<svg width="33" height="33" viewBox="0 0 18 18" fill="#fff">' +
      '<path d="m2.25,12c-.9976,0-1.75-1.0747-1.75-2.5s.7524-2.5,1.75-2.5c.4141,0,.75.3359.75.75,0,.3989.0308,3.0923.0308,3.5063s-.3667.7437-.7808.7437Z"></path>' +
      '<path d="m15.75,12c-.4141,0-.75-.3359-.75-.75s-.0308-3.0923-.0308-3.5063.3667-.7437.7808-.7437c.9976,0,1.75,1.0747,1.75,2.5s-.7524,2.5-1.75,2.5Z"></path>' +
      '<path d="m9,4.5c-.4141,0-.75-.3359-.75-.75V1.5c0-.4141.3359-.75.75-.75s.75.3359.75.75v2.25c0,.4141-.3359.75-.75.75Z"></path>' +
      '<path d="m13.25,3H4.75c-1.5166,0-2.75,1.2334-2.75,2.75v7.5c0,1.5166,1.2334,2.75,2.75,2.75h8.5c1.5166,0,2.75-1.2334,2.75-2.75v-7.5c0-1.5166-1.2334-2.75-2.75-2.75Zm-6.75,8c-.5523,0-1-.6716-1-1.5s.4477-1.5,1-1.5,1,.6716,1,1.5-.4477,1.5-1,1.5Zm5,0c-.5523,0-1-.6716-1-1.5s.4477-1.5,1-1.5,1,.6716,1,1.5-.4477,1.5-1,1.5Z"></path></svg>';
    launcher.addEventListener("mouseenter", function () {
      launcher.style.transform = "scale(1.08)";
    });
    launcher.addEventListener("mouseleave", function () {
      launcher.style.transform = "scale(1)";
    });
    launcher.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      togglePagePopover();
    });

    document.body.appendChild(dot);
    document.body.appendChild(chip);
    document.body.appendChild(bar);
    document.body.appendChild(launcher);

    document
      .getElementById("cms-bridge-exit")!
      .addEventListener("click", function () {
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          /* ignore */
        }
        location.reload();
      });
  }

  // ---------- popover ----------

  let popoverCleanup: (() => void) | null = null;

  // Selected element outlined while its popover is open.
  let highlighted: HTMLElement | null = null;
  let highlightPrev = "";
  let highlightPrevOffset = "";
  const setHighlight = (el: Element | null) => {
    if (highlighted) {
      highlighted.style.outline = highlightPrev;
      highlighted.style.outlineOffset = highlightPrevOffset;
      highlighted = null;
    }
    if (el) {
      highlighted = el as HTMLElement;
      highlightPrev = highlighted.style.outline;
      highlightPrevOffset = highlighted.style.outlineOffset;
      highlighted.style.outline = `2px solid ${ACCENT}`;
      highlighted.style.outlineOffset = "2px";
    }
  };

  // ---------- request popover (one component, element + page modes) ----------

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Dimmed page cover shown while the popover is expanded into a dialog.
  // Clicking it collapses back to the anchored popover (never closes — the
  // client's typed text must survive).
  let backdrop: HTMLDivElement | null = null;
  // Body scroll state restored when the dialog closes (Radix-style lock).
  let prevHtmlOverflow = "";
  let prevBodyOverflow = "";

  function showBackdrop(onCollapse: () => void) {
    if (backdrop) backdrop.remove();
    backdrop = document.createElement("div");
    backdrop.id = "cms-bridge-backdrop";
    // The backdrop is the scroll container: the dialog is appended INTO it and
    // grows with its content; when taller than the viewport the OVERLAY
    // scrolls, not the dialog (flex + margin:auto keeps it centered while
    // scrollable). The page behind is scroll-locked meanwhile.
    backdrop.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;pointer-events:auto;" +
      "background:rgba(9,9,11,.45);overflow:auto;display:flex;" +
      "padding:32px 16px;box-sizing:border-box;";
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) onCollapse();
    });
    document.body.appendChild(backdrop);
    prevHtmlOverflow = document.documentElement.style.overflow;
    prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function hideBackdrop() {
    if (!backdrop) return;
    backdrop.remove();
    backdrop = null;
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.overflow = prevBodyOverflow;
  }

  type RequestMode = "element" | "page";
  let popoverMode: RequestMode | null = null;
  // Image CDN links attached to the pending request (chat-attachment chips).
  let popoverImageUrls: string[] = [];

  function closePopover() {
    if (popoverCleanup) {
      popoverCleanup();
      popoverCleanup = null;
    }
    if (popover) {
      popover.remove();
      popover = null;
      hideBackdrop();
    }
    popoverMode = null;
    popoverImageUrls = [];
    setHighlight(null);
  }

  // Alias kept for call sites — element and page popovers are one component.
  function closePagePopover() {
    closePopover();
  }

  function openPopover(el: Element, groupRefs?: string[]) {
    openRequestPopover("element", el, groupRefs);
  }

  function togglePagePopover() {
    if (popover && popoverMode === "page") {
      closePopover();
      return;
    }
    openRequestPopover("page");
  }

  function openRequestPopover(
    mode: RequestMode,
    el?: Element,
    groupRefs?: string[]
  ) {
    closePopover();
    popoverMode = mode;
    if (mode === "element" && el) setHighlight(el);

    // Where the code lives — the target's own source ref (plus each selected
    // item's ref for a group), or a page marker for launcher requests.
    const ownRef = mode === "element" && el ? sourceRefFor(el) : "";
    const items = (groupRefs || []).filter(Boolean);
    const sourceRef =
      mode === "element"
        ? items.length > 1
          ? `${ownRef} — items: ${items.join(", ")}`.slice(0, 500)
          : ownRef
        : "page:" + location.pathname;
    const isGroup = items.length > 1;
    const preview =
      mode === "element" && el
        ? isGroup
          ? `${items.length} items selected`
          : elementTextFor(el).slice(0, 80)
        : "";
    const contextHtml =
      mode === "element"
        ? isGroup
          ? escapeHtml(preview)
          : preview
            ? "“" + escapeHtml(preview) + "”"
            : "this element"
        : escapeHtml(document.title || "Untitled") +
          ' · <span style="font-family:ui-monospace,monospace">' +
          escapeHtml(location.pathname) +
          "</span>";
    const title =
      mode === "element" ? "Request a change" : "Request a change to this page";
    const placeholder =
      mode === "element"
        ? "Describe what to change…"
        : "Describe what to add or change — paste event or blog details here…";

    // Blue card on purpose — client sites are mostly white, so a white popover
    // disappears into the page. Inputs stay white; primary action inverts to
    // white-on-blue.
    popover = document.createElement("div");
    popover.id = "cms-bridge-popover";
    popover.style.cssText =
      "position:fixed;z-index:2147483647;background:" +
      ACCENT +
      ";color:#fff;" +
      (mode === "page" ? "bottom:100px;right:16px;" : "") +
      "width:500px;max-width:calc(100vw - 24px);border-radius:12px;" +
      "box-shadow:0 0 0 1px rgba(255, 255, 255, 0.08) inset," +
      "0 0 0 1px rgba(9, 9, 11, 0.07)," +
      "0 0.7px 0.9px -1px rgba(9, 9, 11, 0.08)," +
      "0 3px 4px -2px rgba(9, 9, 11, 0.14);padding:14px;" +
      "font:13px/1.4 system-ui,sans-serif;transform-origin:" +
      (mode === "page" ? "bottom right" : "top left") +
      ";animation:cmsPopIn .12s ease-out;";
    popover.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'gap:8px;margin-bottom:2px">' +
      '<span class="cmsb-title" style="font-weight:600">' +
      title +
      "</span>" +
      '<button id="cms-bridge-expand" style="background:rgba(255,255,255,.2);border:none;' +
      "color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;" +
      'font:11px/1 system-ui,sans-serif">Expand</button></div>' +
      '<div class="cmsb-muted" style="color:rgba(255,255,255,.75);font-size:12px;margin-bottom:10px;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
      contextHtml +
      "</div>" +
      '<textarea id="cms-bridge-input" rows="5" placeholder="' +
      placeholder +
      '" style="width:100%;box-sizing:border-box;resize:vertical;background:#fff;color:#111;' +
      "border:1px solid transparent;" +
      "border-radius:8px;padding:8px;font:13px/1.4 system-ui,sans-serif;" +
      'outline:none"></textarea>' +
      '<div id="cms-bridge-chips" style="display:none;flex-wrap:wrap;gap:6px;margin-top:8px"></div>' +
      '<div id="cms-bridge-image-row" style="display:none;gap:8px;margin-top:8px">' +
      '<input id="cms-bridge-page-image" type="text" spellcheck="false" ' +
      'placeholder="Paste an image URL (CDN link)…" ' +
      'style="flex:1;min-width:0;box-sizing:border-box;background:#fff;color:#111;' +
      "border:1px solid transparent;" +
      "border-radius:8px;padding:6px 8px;font:12px/1.2 system-ui,sans-serif;" +
      'outline:none">' +
      '<button id="cms-bridge-image-add" style="background:rgba(255,255,255,.2);border:none;' +
      "color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;" +
      'font:12px/1 system-ui,sans-serif">Add</button></div>' +
      '<div id="cms-bridge-error" style="display:none;color:#ffdcdc;font-size:12px;' +
      'margin-top:8px;word-break:break-word;white-space:pre-wrap"></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
      '<label for="cms-bridge-branch" style="color:rgba(255,255,255,.75);font-size:12px">Branch</label>' +
      '<input id="cms-bridge-branch" type="text" value="' +
      escapeHtml(CFG.branch || "main") +
      '" spellcheck="false" ' +
      'style="flex:1;min-width:0;box-sizing:border-box;background:#fff;color:#111;' +
      "border:1px solid transparent;" +
      "border-radius:8px;padding:6px 8px;font:12px/1.2 system-ui,sans-serif;" +
      'outline:none"></div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:10px">' +
      '<button id="cms-bridge-image-toggle" aria-label="Attach an image URL" ' +
      'style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;' +
      'padding:7px 10px;cursor:pointer;font:12px/1 system-ui,sans-serif;' +
      'display:flex;align-items:center;gap:5px">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none">' +
      '<rect x="3" y="3" width="18" height="18" rx="2" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="8.5" cy="8.5" r="1.5" fill="#fff"/>' +
      '<path d="M21 15l-5-5L5 21" stroke="#fff" stroke-width="2"/></svg>' +
      "Image</button>" +
      '<span style="flex:1"></span>' +
      '<button id="cms-bridge-cancel" style="background:rgba(255,255,255,.2);border:none;' +
      "color:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;" +
      'font:12px/1 system-ui,sans-serif">Cancel</button>' +
      '<button id="cms-bridge-send" style="background:#fff;border:none;color:#111;' +
      "border-radius:8px;padding:7px 14px;cursor:pointer;" +
      'font:12px/1 system-ui,sans-serif">Send</button>' +
      "</div>";

    document.body.appendChild(popover);

    let expanded = false;

    // Element mode: keep the popover pinned to the element — recompute from
    // its live rect on scroll/resize so it travels with the selection. Page
    // mode is a fixed bottom-right anchor and needs none of this.
    const reposition = () => {
      if (!popover || expanded || mode !== "element" || !el) return;
      const r = el.getBoundingClientRect();
      const pw = popover.offsetWidth;
      const ph = popover.offsetHeight;
      const left = Math.max(12, Math.min(r.left, window.innerWidth - pw - 12));
      let top = r.bottom + 8;
      if (top + ph > window.innerHeight - 12) {
        top = Math.max(12, r.top - ph - 8);
      }
      popover.style.left = left + "px";
      popover.style.top = top + "px";
    };
    if (mode === "element") {
      reposition();
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);
      popoverCleanup = () => {
        window.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
      };
    }

    const input = document.getElementById(
      "cms-bridge-input"
    ) as HTMLTextAreaElement;
    const chips = document.getElementById("cms-bridge-chips")!;
    const imageRow = document.getElementById("cms-bridge-image-row")!;
    const imageInput = document.getElementById(
      "cms-bridge-page-image"
    ) as HTMLInputElement;
    const imageAdd = document.getElementById("cms-bridge-image-add")!;
    const imageToggle = document.getElementById("cms-bridge-image-toggle")!;
    const errorEl = document.getElementById("cms-bridge-error")!;
    const branchInput = document.getElementById(
      "cms-bridge-branch"
    ) as HTMLInputElement;
    const send = document.getElementById("cms-bridge-send") as HTMLButtonElement;
    const cancel = document.getElementById("cms-bridge-cancel")!;
    const expandBtn = document.getElementById("cms-bridge-expand")!;

    input.focus();

    const showError = (message: string) => {
      errorEl.textContent = message;
      errorEl.style.display = "block";
    };
    const clearError = () => {
      errorEl.style.display = "none";
      errorEl.textContent = "";
    };

    const renderChips = () => {
      chips.style.display = popoverImageUrls.length ? "flex" : "none";
      chips.innerHTML = popoverImageUrls
        .map(function (url, i) {
          const short =
            url.length > 42 ? url.slice(0, 24) + "…" + url.slice(-14) : url;
          return (
            '<span style="display:inline-flex;align-items:center;gap:5px;' +
            "background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:4px 8px;" +
            'font:11px/1.2 system-ui,sans-serif;max-width:100%">' +
            escapeHtml(short) +
            '<button data-chip="' +
            i +
            '" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;' +
            'padding:0;font:12px/1 system-ui,sans-serif">×</button></span>'
          );
        })
        .join("");
      chips.querySelectorAll("[data-chip]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          popoverImageUrls.splice(Number(btn.getAttribute("data-chip")), 1);
          renderChips();
        });
      });
    };

    const addImage = () => {
      const url = imageInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        showError("Image links must start with http:// or https://.");
        return;
      }
      if (popoverImageUrls.length >= 10) {
        showError("Up to 10 image links per request.");
        return;
      }
      clearError();
      popoverImageUrls.push(url);
      imageInput.value = "";
      renderChips();
      imageInput.focus();
    };

    imageToggle.addEventListener("click", function () {
      const open = imageRow.style.display !== "flex";
      imageRow.style.display = open ? "flex" : "none";
      if (open) imageInput.focus();
    });
    imageAdd.addEventListener("click", addImage);
    imageInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addImage();
      }
      if (e.key === "Escape") closePopover();
    });

    // Dialog mode: the textarea hugs its content and grows line-by-line.
    const autoGrow = () => {
      if (!expanded) return;
      input.style.height = "auto";
      input.style.height = input.scrollHeight + 2 + "px";
    };
    input.addEventListener("input", autoGrow);

    // Expand ↔ collapse: the same node moves between its anchor and a centered
    // dialog inside the scrollable backdrop, so text, error state, and image
    // chips survive the toggle.
    const setExpanded = (next: boolean) => {
      if (!popover) return;
      expanded = next;
      expandBtn.textContent = next ? "Collapse" : "Expand";
      if (next) {
        showBackdrop(function () {
          setExpanded(false);
        });
        backdrop!.appendChild(popover);
        popover.classList.add("cms-expanded");
        popover.style.position = "static";
        popover.style.left = "";
        popover.style.top = "";
        popover.style.right = "";
        popover.style.bottom = "";
        popover.style.transform = "";
        popover.style.margin = "auto";
        popover.style.width = "680px";
        popover.style.maxWidth = "100%";
        input.style.resize = "none";
        input.style.overflow = "hidden";
        input.style.minHeight = "9em";
        autoGrow();
      } else {
        popover.classList.remove("cms-expanded");
        document.body.appendChild(popover);
        hideBackdrop();
        popover.style.position = "fixed";
        popover.style.margin = "";
        popover.style.width = "500px";
        popover.style.maxWidth = "calc(100vw - 24px)";
        input.style.resize = "vertical";
        input.style.overflow = "";
        input.style.minHeight = "";
        input.style.height = "";
        if (mode === "page") {
          popover.style.bottom = "100px";
          popover.style.right = "16px";
          popover.style.left = "";
          popover.style.top = "";
        } else {
          reposition();
        }
      }
      input.focus();
    };
    expandBtn.addEventListener("click", function () {
      setExpanded(!expanded);
    });

    cancel.addEventListener("click", closePopover);

    const doSend = function () {
      const prompt = input.value.trim();
      // Matches the intake's server-side minimum — validate here so the client
      // never sees a raw HTTP 400 for a too-short prompt.
      if (prompt.length < 4) {
        input.style.borderColor = "#e5484d";
        input.focus();
        showError("Please describe the change — at least 4 characters.");
        return;
      }
      input.style.borderColor = "transparent";
      clearError();
      const branch = branchInput.value.trim() || CFG.branch || "main";
      send.disabled = true;
      send.textContent = "Sending…";
      postIntake({
        branch: branch,
        sourceRef: sourceRef,
        elementText:
          mode === "element" && el
            ? elementTextFor(el)
            : (document.title || "").slice(0, 2000),
        pageUrl: location.href,
        prompt: prompt,
        ...(popoverImageUrls.length ? { imageUrls: popoverImageUrls } : {}),
      }).then(
        function (created) {
          notifySubmitted(created.id);
          closePopover();
          showChip(true, mode === "element" ? "Change requested" : "Request sent");
        },
        function (err) {
          // Keep the popover open and show the real reason so it can be retried.
          send.disabled = false;
          send.textContent = "Send";
          showError(err instanceof Error ? err.message : "Could not send.");
        }
      );
    };

    send.addEventListener("click", doSend);
    input.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") doSend();
      if (e.key === "Escape") closePopover();
    });
  }

  // ---------- animation state ----------

  const mouse = { x: -100, y: -100 };
  const cur = { x: -100, y: -100, w: 10, h: 10, r: 5 };
  let target: Element | null = null;

  // Drag-select (marquee) state.
  const DRAG_THRESHOLD = 6;
  let dragStart: { x: number; y: number } | null = null;
  let marquee: HTMLDivElement | null = null;
  let dragging = false;
  let justDragged = false;

  function lerp(a: number, b: number, f: number) {
    return a + (b - a) * f;
  }

  function frame() {
    // While marquee-dragging, keep the dot a plain dot (don't morph over
    // elements) and fade it out via opacity below.
    if (dragging) target = null;
    let goal;
    if (target && document.body.contains(target)) {
      const rect = target.getBoundingClientRect();
      goal = { x: rect.left, y: rect.top, w: rect.width, h: rect.height, r: 8 };
    } else {
      target = null;
      goal = { x: mouse.x - 5, y: mouse.y - 5, w: 10, h: 10, r: 5 };
    }
    const f = 0.22;
    cur.x = lerp(cur.x, goal.x, f);
    cur.y = lerp(cur.y, goal.y, f);
    cur.w = lerp(cur.w, goal.w, f);
    cur.h = lerp(cur.h, goal.h, f);
    cur.r = lerp(cur.r, goal.r, f);

    if (dot && document.body.contains(dot)) {
      dot.style.transform = "translate3d(" + cur.x + "px," + cur.y + "px,0)";
      dot.style.width = cur.w + "px";
      dot.style.height = cur.h + "px";
      dot.style.borderRadius = target ? cur.r + "px" : "50%";
      dot.style.background = target ? "transparent" : ACCENT;
      // Fade out during a drag; fade back after.
      dot.style.opacity = dragging ? "0" : "1";
    }
    requestAnimationFrame(frame);
  }

  // ---------- events ----------

  function editableFrom(node: EventTarget | null): Element | null {
    if (!(node instanceof Element)) return null;
    const el = node.closest(EDITABLE);
    if (!el || !el.closest("[data-cms-src]")) return null;
    if (
      el.closest("#cms-bridge-dot") ||
      el.closest("#cms-bridge-launcher") ||
      (bar && bar.contains(el)) ||
      (popover && popover.contains(el))
    )
      return null;
    return el;
  }

  const inOwnUi = (el: Element) =>
    !!(
      el.closest("#cms-bridge-dot") ||
      el.closest("#cms-bridge-bar") ||
      el.closest("#cms-bridge-popover") ||
      el.closest("#cms-bridge-marquee") ||
      el.closest("#cms-bridge-launcher") ||
      el.closest("#cms-bridge-backdrop")
    );

  /** Annotated elements fully contained within the marquee rect. */
  function elementsInRect(r: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }): Element[] {
    const out: Element[] = [];
    document.querySelectorAll("[data-cms-src]").forEach((el) => {
      if (inOwnUi(el)) return;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (
        b.left >= r.left &&
        b.right <= r.right &&
        b.top >= r.top &&
        b.bottom <= r.bottom
      ) {
        out.push(el);
      }
    });
    return out;
  }

  /** Lowest common ancestor of two nodes. */
  function lca(a: Element, b: Element): Element {
    const anc = new Set<Element>();
    for (let n: Element | null = a; n; n = n.parentElement) anc.add(n);
    for (let n: Element | null = b; n; n = n.parentElement)
      if (anc.has(n)) return n;
    return document.body;
  }

  /**
   * The smart parent for a drag selection: the lowest common ancestor of the
   * selected items, walked up to the nearest element that carries data-cms-src
   * (every annotated element has one, so this resolves to the real wrapper).
   */
  function smartParent(els: Element[]): Element | null {
    if (!els.length) return null;
    let anc: Element = els[0];
    for (let i = 1; i < els.length; i++) anc = lca(anc, els[i]);
    let p: Element | null = anc;
    while (p && !p.hasAttribute("data-cms-src")) p = p.parentElement;
    return p;
  }


  function bindOnce() {
    if (window.__cmsBridgeBound) return;
    window.__cmsBridgeBound = true;

    document.addEventListener(
      "mousemove",
      function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      },
      { passive: true }
    );

    // ----- drag-select (marquee) -----
    document.addEventListener("mousedown", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
      if (e.target instanceof Element && inOwnUi(e.target)) return;
      dragStart = { x: e.clientX, y: e.clientY };
      dragging = false;
    });

    document.addEventListener("mousemove", function (e) {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragging = true;
      e.preventDefault(); // suppress native text selection while marqueeing
      if (!marquee) {
        marquee = document.createElement("div");
        marquee.id = "cms-bridge-marquee";
        marquee.style.cssText =
          "position:fixed;z-index:2147483646;pointer-events:none;" +
          "border:1px solid " +
          ACCENT +
          ";background:color-mix(in oklch, " +
          ACCENT +
          " 12%, transparent);border-radius:4px;";
        document.body.appendChild(marquee);
      }
      const left = Math.min(dragStart.x, e.clientX);
      const top = Math.min(dragStart.y, e.clientY);
      marquee.style.left = left + "px";
      marquee.style.top = top + "px";
      marquee.style.width = Math.abs(e.clientX - dragStart.x) + "px";
      marquee.style.height = Math.abs(e.clientY - dragStart.y) + "px";
    });

    document.addEventListener("mouseup", function () {
      if (!dragStart) return;
      const wasDragging = dragging;
      dragStart = null;
      dragging = false;
      if (!wasDragging || !marquee) {
        if (marquee) {
          marquee.remove();
          marquee = null;
        }
        return;
      }
      const b = marquee.getBoundingClientRect();
      const rect = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      marquee.remove();
      marquee = null;
      justDragged = true; // swallow the click that follows this mouseup
      const selected = elementsInRect(rect);
      const parent = smartParent(selected);
      if (parent) {
        const refs = selected
          .map((el) => el.getAttribute("data-cms-src") || "")
          .filter(Boolean);
        openPopover(parent, refs);
      } else {
        closePopover();
      }
    });

    document.addEventListener(
      "mouseover",
      function (e) {
        const el = editableFrom(e.target);
        if (el) target = el;
      },
      true
    );

    document.addEventListener(
      "mouseout",
      function (e) {
        if (
          target &&
          e.target instanceof Element &&
          e.target.closest(EDITABLE) === target
        ) {
          const to = e.relatedTarget;
          if (!(to instanceof Element) || editableFrom(to) !== target)
            target = null;
        }
      },
      true
    );

    document.addEventListener(
      "click",
      function (e) {
        // Swallow the click that fires right after a drag-select.
        if (justDragged) {
          justDragged = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // Cmd/Ctrl-click passes through — lets the client follow links.
        if (e.metaKey || e.ctrlKey) return;
        // Clicks inside our own UI pass through to their own handlers.
        if (
          e.target instanceof Element &&
          ((popover && popover.contains(e.target)) ||
            (bar && bar.contains(e.target)) ||
            e.target.closest("#cms-bridge-launcher") ||
            e.target.closest("#cms-bridge-backdrop"))
        )
          return;
        const el = editableFrom(e.target);
        if (!el) {
          closePopover();
          closePagePopover();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        openPopover(el);
      },
      true
    );

    requestAnimationFrame(frame);
  }

  function init() {
    if (!active()) return;
    makeOverlay();
    bindOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // ClientRouter swaps <body> on view transitions — recreate overlay DOM.
  document.addEventListener("astro:page-load", init);
})();

export {};

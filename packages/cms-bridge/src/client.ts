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
  owner?: string;
  repo?: string;
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
  // Elements tagged data-collection="<name>" are collection regions — they get a
  // distinct purple highlight + a direct "Edit in CMS" pill instead of the
  // click-to-request flow.
  const COLLECTION_ACCENT = "#a855f7";
  const ringColor = () => `color-mix(in oklch, ${ACCENT} 45%, transparent)`;

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

  async function submitEdit(
    el: Element,
    prompt: string,
    sourceRef: string,
    branch: string
  ): Promise<void> {
    const endpoint = (CFG.endpoint || "").replace(/\/+$/, "");
    if (!endpoint) {
      throw new Error("No endpoint configured in the cms-bridge integration.");
    }
    const token = getToken();
    if (!token) {
      throw new Error("Edit session token missing — reopen from the editor.");
    }
    if (!CFG.repoId || !CFG.owner || !CFG.repo) {
      throw new Error("Site is missing repoId/owner/repo in its cms-bridge config.");
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
        body: JSON.stringify({
          repoId: CFG.repoId,
          owner: CFG.owner,
          repo: CFG.repo,
          branch: branch,
          sourceRef: sourceRef,
          elementText: elementTextFor(el),
          pageUrl: location.href,
          prompt: prompt,
        }),
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
  }

  // ---------- overlay DOM ----------

  let dot: HTMLDivElement,
    chip: HTMLDivElement,
    bar: HTMLDivElement,
    collBtn: HTMLButtonElement,
    collRing: HTMLDivElement,
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
      "#cms-bridge-popover,#cms-bridge-input,#cms-bridge-branch{-webkit-user-select:text;user-select:text}" +
      "#cms-bridge-chip.in{animation:cmsChipIn .28s cubic-bezier(.34,1.56,.64,1) forwards}" +
      "#cms-bridge-chip.in svg path{animation:cmsTick .25s ease-out .08s forwards}" +
      "#cms-bridge-chip.out{animation:cmsChipOut .18s ease-in forwards}" +
      // Focus ring + primary border on the textarea, matching the hub input.
      "#cms-bridge-input,#cms-bridge-branch{transition:border-color .15s ease,box-shadow .15s ease}" +
      // !important beats the inline border so the accent shows on focus.
      "#cms-bridge-input:focus,#cms-bridge-branch:focus{border-color:" +
      ACCENT +
      " !important;box-shadow:0 0 0 3px " +
      ringColor() +
      " !important}";
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

    // Dashed ring drawn around a hovered collection region. A separate overlay
    // (never touches the client element's styles); frame() sizes it to the
    // wrapper rect plus padding.
    collRing = document.createElement("div");
    collRing.id = "cms-bridge-collection-ring";
    collRing.style.cssText =
      "position:fixed;top:0;left:0;display:none;pointer-events:none;" +
      "z-index:2147483646;box-sizing:border-box;border:3px dashed " +
      COLLECTION_ACCENT +
      ";border-radius:12px;";

    // Floating pill for collection regions — opens that collection's editor in
    // the parent hub. pointer-events:auto so it's clickable; frame() positions
    // it over the hovered wrapper.
    collBtn = document.createElement("button");
    collBtn.id = "cms-bridge-collection-btn";
    collBtn.style.cssText =
      "position:fixed;top:0;left:0;display:none;pointer-events:auto;" +
      "z-index:2147483647;background:" +
      COLLECTION_ACCENT +
      ";color:#fff;border:none;border-radius:999px;padding:12px 22px;" +
      "font:600 16px/1 system-ui,sans-serif;cursor:pointer;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.3);white-space:nowrap;";
    collBtn.textContent = "Edit in CMS ↗";

    document.body.appendChild(dot);
    document.body.appendChild(chip);
    document.body.appendChild(bar);
    document.body.appendChild(collRing);
    document.body.appendChild(collBtn);

    collBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openCollection(collectionTarget);
    });

    document
      .getElementById("cms-bridge-exit")!
      .addEventListener("click", function () {
        setCollectionHover(null);
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

  // Currently-hovered collection wrapper (data-collection) — purple-outlined,
  // with the "Edit in CMS" pill tracking it.
  let collectionTarget: Element | null = null;
  const setCollectionHover = (col: Element | null) => {
    if (collectionTarget === col) return;
    collectionTarget = col;
    const show = col ? "block" : "none";
    if (collRing) collRing.style.display = show;
    if (collBtn) collBtn.style.display = show;
  };

  // Tell the parent hub to open this collection's editor (context state, no
  // route). No-op when not framed by the hub.
  function openCollection(col: Element | null) {
    if (!col) return;
    const name = col.getAttribute("data-collection") || "";
    if (!name) return;
    if (window.parent !== window) {
      window.parent.postMessage(
        { cms: 1, v: 2, type: "collection-open", collection: name },
        "*"
      );
    }
  }

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

  function closePopover() {
    if (popoverCleanup) {
      popoverCleanup();
      popoverCleanup = null;
    }
    if (popover) {
      popover.remove();
      popover = null;
    }
    setHighlight(null);
  }

  function openPopover(el: Element, groupRefs?: string[]) {
    closePopover();
    setHighlight(el);
    // Where the code lives — the target's own source ref, plus each selected
    // item's ref for a group so the AI knows exactly which lines to edit.
    const ownRef = sourceRefFor(el);
    const items = (groupRefs || []).filter(Boolean);
    const sourceRef =
      items.length > 1
        ? `${ownRef} — items: ${items.join(", ")}`.slice(0, 500)
        : ownRef;
    const isGroup = items.length > 1;
    const preview = isGroup
      ? `${items.length} items selected`
      : elementTextFor(el).slice(0, 80);

    popover = document.createElement("div");
    popover.id = "cms-bridge-popover";
    popover.style.cssText =
      "position:fixed;z-index:2147483647;background:#fff;color:#111;" +
      "width:300px;max-width:calc(100vw - 24px);border-radius:12px;" +
      "box-shadow:0 0 0 1px rgba(255, 255, 255, 0.08) inset," +
      "0 0 0 1px rgba(9, 9, 11, 0.07)," +
      "0 0.7px 0.9px -1px rgba(9, 9, 11, 0.08)," +
      "0 3px 4px -2px rgba(9, 9, 11, 0.14);padding:14px;" +
      "font:13px/1.4 system-ui,sans-serif;transform-origin:top left;" +
      "animation:cmsPopIn .12s ease-out;";
    popover.innerHTML =
      '<div style="font-weight:600;margin-bottom:2px">Request a change</div>' +
      '<div style="color:#666;font-size:12px;margin-bottom:10px;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap">' +
      (isGroup
        ? escapeHtml(preview)
        : preview
          ? "“" + escapeHtml(preview) + "”"
          : "this element") +
      "</div>" +
      '<textarea id="cms-bridge-input" rows="3" placeholder="Describe what to change…" ' +
      'style="width:100%;box-sizing:border-box;resize:vertical;border:1px solid #ddd;' +
      "border-radius:8px;padding:8px;font:13px/1.4 system-ui,sans-serif;" +
      'outline:none"></textarea>' +
      '<div id="cms-bridge-error" style="display:none;color:#e5484d;font-size:12px;' +
      'margin-top:8px;word-break:break-word;white-space:pre-wrap"></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
      '<label for="cms-bridge-branch" style="color:#666;font-size:12px">Branch</label>' +
      '<input id="cms-bridge-branch" type="text" value="' +
      escapeHtml(CFG.branch || "main") +
      '" spellcheck="false" ' +
      'style="flex:1;min-width:0;box-sizing:border-box;border:1px solid #ddd;' +
      "border-radius:8px;padding:6px 8px;font:12px/1.2 system-ui,sans-serif;" +
      'outline:none"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">' +
      '<button id="cms-bridge-cancel" style="background:#f2f2f2;border:none;' +
      "color:#333;border-radius:8px;padding:7px 12px;cursor:pointer;" +
      'font:12px/1 system-ui,sans-serif">Cancel</button>' +
      '<button id="cms-bridge-send" style="background:' +
      ACCENT +
      ";border:none;color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;" +
      'font:12px/1 system-ui,sans-serif">Send</button>' +
      "</div>";

    document.body.appendChild(popover);

    // Keep the popover pinned to the element — recompute from its live rect on
    // scroll/resize so it travels with the selected element.
    const reposition = () => {
      if (!popover) return;
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
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    popoverCleanup = () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };

    const input = document.getElementById(
      "cms-bridge-input"
    ) as HTMLTextAreaElement;
    input.focus();

    const send = document.getElementById("cms-bridge-send") as HTMLButtonElement;
    const cancel = document.getElementById("cms-bridge-cancel")!;
    const errorEl = document.getElementById("cms-bridge-error")!;
    const branchInput = document.getElementById(
      "cms-bridge-branch"
    ) as HTMLInputElement;

    cancel.addEventListener("click", closePopover);

    const doSend = function () {
      const prompt = input.value.trim();
      if (prompt.length < 3) {
        input.style.borderColor = "#e5484d";
        input.focus();
        return;
      }
      errorEl.style.display = "none";
      errorEl.textContent = "";
      const branch = branchInput.value.trim() || CFG.branch || "main";
      send.disabled = true;
      send.textContent = "Sending…";
      submitEdit(el, prompt, sourceRef, branch).then(
        function () {
          closePopover();
          showChip(true, "Change requested");
        },
        function (err) {
          // Keep the popover open and show the real reason so it can be retried.
          send.disabled = false;
          send.textContent = "Send";
          errorEl.textContent =
            err instanceof Error ? err.message : "Could not send.";
          errorEl.style.display = "block";
        }
      );
    };

    send.addEventListener("click", doSend);
    input.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") doSend();
      if (e.key === "Escape") closePopover();
    });
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    // While marquee-dragging OR hovering a collection region, keep the dot a
    // plain dot (don't morph over elements) and fade it out via opacity below.
    if (dragging || collectionTarget) target = null;
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
      // Fade out during a drag or over a collection region; fade back after.
      dot.style.opacity = dragging || collectionTarget ? "0" : "1";
    }

    // Draw the dashed ring around the hovered wrapper (rect + padding) and pin
    // the pill to its top-right, clamped on-screen.
    if (collectionTarget && document.body.contains(collectionTarget)) {
      const r = collectionTarget.getBoundingClientRect();
      const pad = 6;
      if (collRing) {
        collRing.style.left = r.left - pad + "px";
        collRing.style.top = r.top - pad + "px";
        collRing.style.width = r.width + pad * 2 + "px";
        collRing.style.height = r.height + pad * 2 + "px";
      }
      const bw = collBtn.offsetWidth;
      collBtn.style.left =
        Math.max(8, Math.min(r.right - bw, window.innerWidth - bw - 8)) + "px";
      collBtn.style.top = Math.max(8, r.top + 8) + "px";
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
      el.closest("#cms-bridge-collection-btn") ||
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
      el.closest("#cms-bridge-collection-btn")
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
        // Collection wrappers are plain divs (not in EDITABLE), so resolve from
        // the raw target. Over our own pill, keep the current hover so the pill
        // stays reachable.
        const raw = e.target instanceof Element ? e.target : null;
        if (raw && inOwnUi(raw)) return;
        setCollectionHover(raw ? raw.closest("[data-collection]") : null);
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
            (bar && bar.contains(e.target)))
        )
          return;
        const el = editableFrom(e.target);
        if (!el) {
          closePopover();
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
    // View transitions swap <body>; drop any stale collection highlight/pill.
    setCollectionHover(null);
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

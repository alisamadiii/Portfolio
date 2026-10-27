/*
 * Ali Samadii LLC booking widget.
 * <script src="https://api.alisamadii.com/booking.js" data-key="PROJECT_REPO_ID" defer></script>
 * <button data-booking>Book an appointment</button>
 * data-key is the project's repoId (shown in the Hub).
 *
 * The site styles its own trigger; this script only handles the popup.
 * Clicking any element with data-booking opens a Cal.com-style booking
 * dialog on top of the page: a summary panel with the meeting types, a
 * month calendar, and the day's 15-minute times. Booking puts the meeting
 * on the owner's Google Calendar and Google emails the invite to both sides.
 *
 * Optional attributes on the trigger element:
 *   data-type="abc123"         skip the type picker, book this meeting type
 *   data-accent="#0f766e"      dialog highlight color (default: brand orange)
 *   data-theme="dark"          dark dialog (default is light)
 *
 * Works alongside leads.js: it reads the same attribution cookies, so bookings
 * are credited to the ad or link that brought the visitor. If booking is
 * not set up or the calendar can't be read, the dialog says so.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-key");
  if (!key) return;
  var endpoint =
    new URL(script.src).origin + "/api/agency/booking/" + encodeURIComponent(key);
  var loadedAt = Date.now();
  var DAY = 24 * 60 * 60 * 1000;

  // ── Attribution (same cookies leads.js writes; URL params as fallback) ──
  var PARAMS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"];

  function readCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return null;
    }
  }

  function attribution() {
    var attr = readCookie("_lead_attr");
    if (!attr) {
      attr = {};
      var query = new URLSearchParams(location.search);
      PARAMS.forEach(function (p) {
        var v = query.get(p);
        if (v) attr[p] = v.slice(0, 500);
      });
    }
    return attr;
  }

  // ── One widget per [data-booking] trigger ──────────────────────
  function setup(host) {
    // Brand default: the agency's coral. data-accent overrides per site.
    var accent = host.getAttribute("data-accent") || "#fc8464";
    var presetType = host.getAttribute("data-type");
    var dark = host.getAttribute("data-theme") === "dark";

    // The dialog lives in its own container on <body>: the trigger element
    // stays exactly as the site styled it, and position:fixed can't be
    // broken by a transformed ancestor around the trigger.
    var container = document.createElement("div");
    var root = container.attachShadow
      ? container.attachShadow({ mode: "open" })
      : container;
    document.body.appendChild(container);

    // Theme tokens: light by default, flipped wholesale for data-theme="dark".
    var T = dark
      ? { bg: "#141414", fg: "#f5f3f0", muted: "#9b958c", line: "#2c2c2c", tile: "#2a2a2a", tileFg: "#f5f3f0", hover: "#242424", field: "#1d1d1d", shadow: "0 24px 64px rgba(0,0,0,.55)" }
      : { bg: "#ffffff", fg: "#2b2926", muted: "#8a847b", line: "#eceae5", tile: "#f3f1ec", tileFg: "#2b2926", hover: "#f7f5f1", field: "#ffffff", shadow: "0 24px 64px rgba(20,18,16,.28)" };

    var style = document.createElement("style");
    style.textContent =
      ":host{all:initial}" +
      ".bk,.bk *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
      // Native button chrome can bleed through transparent backgrounds.
      ".bk button{-webkit-appearance:none;appearance:none}" +
      ".overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,13,11,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;transition:opacity .16s ease}" +
      ".overlay.open{opacity:1}" +
      ".dlg{position:relative;width:min(940px,100%);max-height:min(640px,calc(100vh - 48px));display:flex;flex-direction:column;background:" + T.bg + ";color:" + T.fg + ";border:1px solid " + T.line + ";border-radius:20px;box-shadow:" + T.shadow + ";opacity:0;transform:translateY(6px);transition:opacity .16s ease,transform .16s ease;font-size:14px;line-height:1.5;overflow:hidden}" +
      ".overlay.open .dlg{opacity:1;transform:none}" +
      // The scroll container: without it the clipped dialog can't scroll on phones.
      ".content{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}" +
      // Desktop: fixed-height dialog, each column scrolls on its own; the
      // times column gets its own scrollbar instead of growing the dialog.
      "@media (min-width:761px){" +
      ".dlg{height:min(640px,calc(100vh - 48px))}" +
      ".content{overflow:hidden;display:flex;flex-direction:column}" +
      ".panes{flex:1;min-height:0;overflow:visible;grid-template-rows:minmax(0,1fr)}" +
      ".cal{overflow-y:auto}" +
      ".times{overflow:hidden}" +
      "}" +
      ".close{position:absolute;top:14px;right:14px;z-index:2;width:30px;height:30px;display:flex;align-items:center;justify-content:center;padding:0;border:none;background:" + T.tile + ";color:" + T.muted + ";border-radius:999px;cursor:pointer;font-size:16px;line-height:1;transition:opacity .16s ease}" +
      ".close:hover{opacity:.8}" +
      ".panes{display:grid;grid-template-columns:250px 1fr 236px;min-height:480px;overflow-y:auto}" +
      "@media (max-width:760px){.overlay{padding:0;align-items:flex-end}.dlg{width:100%;max-height:92vh;max-height:92dvh;border-radius:20px 20px 0 0}.panes{display:block;min-height:0}}" +
      ".pane{padding:22px}" +
      ".info{border-right:1px solid " + T.line + "}" +
      ".times{border-left:1px solid " + T.line + ";display:flex;flex-direction:column;min-height:0}" +
      "@media (max-width:760px){.info{border-right:none;border-bottom:1px solid " + T.line + "}.times{border-left:none;border-top:1px solid " + T.line + "}}" +
      ".avatar{width:34px;height:34px;border-radius:999px;background:" + accent + ";color:#fff;display:flex;align-items:center;justify-content:center;font-weight:650;font-size:15px;margin-bottom:10px;text-transform:uppercase}" +
      ".site{color:" + T.muted + ";font-size:13px}" +
      ".info h3{margin:2px 0 14px;font-size:19px;font-weight:650;letter-spacing:-.01em}" +
      ".meta{display:flex;align-items:center;gap:8px;color:" + T.muted + ";font-size:13px;margin:7px 0}" +
      ".meta svg{flex:none;opacity:.75}" +
      ".typelist{margin:4px 0 12px}" +
      ".type{display:block;width:100%;text-align:left;cursor:pointer;background:none;color:" + T.fg + ";border:1px solid " + T.line + ";border-radius:12px;padding:10px 12px;margin-bottom:7px;transition:border-color .16s ease,background .16s ease;font-size:13.5px}" +
      ".type:hover{background:" + T.hover + "}" +
      ".type.on{border-color:" + accent + ";box-shadow:inset 0 0 0 1px " + accent + "}" +
      ".type .t{font-weight:600}" +
      ".type .d{color:" + T.muted + ";font-size:12px;margin-top:1px}" +
      ".cal{padding:22px 26px}" +
      ".calhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}" +
      ".calhead .m{font-size:16px;font-weight:650}" +
      ".calhead .m span{color:" + T.muted + ";font-weight:400}" +
      ".nav{border:none;background:none;cursor:pointer;color:" + T.muted + ";font-size:17px;padding:4px 9px;border-radius:8px}" +
      ".nav:hover{background:" + T.hover + "}" +
      ".nav[disabled]{opacity:.3;cursor:default;background:none}" +
      ".grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}" +
      ".grid .wd{text-align:center;font-size:10.5px;letter-spacing:.08em;color:" + T.muted + ";text-transform:uppercase;padding:4px 0 8px}" +
      ".grid .day{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:none;border-radius:10px;background:none;color:" + T.muted + ";font-size:13.5px;cursor:default}" +
      ".grid .day.has{background:" + T.tile + ";color:" + T.tileFg + ";cursor:pointer;font-weight:600;transition:background .16s ease}" +
      ".grid .day.has:hover{background:" + T.hover + ";box-shadow:inset 0 0 0 1px " + T.line + "}" +
      ".grid .day.on{background:" + accent + ";color:#fff}" +
      ".grid .day.on:after{content:'';position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:99px;background:#fff}" +
      ".timehead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex:none;padding-right:36px}" +
      ".timehead .d{font-size:14.5px;font-weight:650}" +
      ".timehead .d span{color:" + T.muted + ";font-weight:400}" +
      ".fmt{display:flex;border:1px solid " + T.line + ";border-radius:9px;overflow:hidden}" +
      ".fmt button{border:none;background:none;color:" + T.muted + ";font-size:11.5px;font-weight:600;padding:4px 8px;cursor:pointer}" +
      ".fmt button.on{background:" + T.tile + ";color:" + T.fg + "}" +
      ".slotcol{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:7px;padding-right:2px;min-height:0}" +
      "@media (max-width:760px){.slotcol{max-height:240px}}" +
      ".slotcol button{flex:none;cursor:pointer;border:1px solid " + T.line + ";background:none;color:" + T.fg + ";border-radius:10px;padding:10px 4px;font-weight:600;font-size:13.5px;transition:border-color .16s ease}" +
      ".slotcol button:hover{border-color:" + accent + "}" +
      ".empty{color:" + T.muted + ";font-size:13px;padding:26px 8px;text-align:center}" +
      // Month availability is being fetched: calendar pulses, times show a spinner.
      "@keyframes bk-pulse{0%,100%{opacity:.45}50%{opacity:.75}}" +
      ".grid.loading{animation:bk-pulse 1.2s ease-in-out infinite;pointer-events:none}" +
      "@keyframes bk-spin{to{transform:rotate(360deg)}}" +
      ".spin{width:20px;height:20px;margin:30px auto;border:2px solid " + T.line + ";border-top-color:" + accent + ";border-radius:999px;animation:bk-spin .7s linear infinite}" +
      ".formgrid{display:grid;grid-template-columns:250px 1fr;min-height:480px}" +
      "@media (max-width:760px){.formgrid{display:block;min-height:0}}" +
      ".bk label{display:block;font-size:12.5px;font-weight:600;margin:11px 0 5px}" +
      ".bk input,.bk textarea{width:100%;border:1px solid " + T.line + ";border-radius:11px;padding:10px 12px;font-size:14px;background:" + T.field + ";color:" + T.fg + ";outline:none;transition:border-color .16s ease}" +
      ".bk input:focus,.bk textarea:focus{border-color:" + accent + "}" +
      ".bk textarea{min-height:66px;resize:vertical}" +
      ".cta{width:100%;margin-top:16px;cursor:pointer;background:" + accent + ";color:#fff;border:none;padding:12px;font-size:14.5px;font-weight:600;border-radius:999px;transition:opacity .16s ease}" +
      ".cta[disabled]{opacity:.6;cursor:default}" +
      ".back{display:inline-block;border:none;background:none;cursor:pointer;color:" + T.muted + ";padding:0;font-size:12.5px;margin-bottom:10px}" +
      ".back:hover{color:" + T.fg + "}" +
      ".err{color:#e05d4a;font-size:13px;margin-top:10px}" +
      ".ok{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 24px;min-height:360px}" +
      ".ok .big{width:52px;height:52px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;background:" + accent + ";color:#fff;border-radius:999px;font-size:24px}" +
      ".ok h4{margin:0;font-size:18px;font-weight:650}" +
      ".ok p{margin:6px 0 0;color:" + T.muted + ";font-size:13.5px}" +
      ".hp{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}";
    root.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "bk";
    root.appendChild(wrap);

    var state = {
      config: null,
      type: null,
      month: firstOfMonth(new Date()),
      day: null,
      slots: {}, // local day key -> slot ISO strings
      months: {}, // "yyyy-m" -> fetched
      slot: null,
      hour12: true,
      sending: false,
      booked: false,
    };

    var overlay = null;
    var content = null;

    function firstOfMonth(d) {
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    function startOfToday() {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      return node;
    }
    function dayKey(ms) {
      var d = new Date(ms);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    function timeFmt() {
      return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: state.hour12 });
    }
    var monthFmt = new Intl.DateTimeFormat(undefined, { month: "long" });
    var weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
    var longFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
    var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    var ICONS = {
      clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      video: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l7-3v10l-7-3"/></svg>',
      globe: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
    };
    function meta(icon, text) {
      var row = el("div", "meta");
      row.innerHTML = ICONS[icon];
      row.appendChild(document.createTextNode(text));
      return row;
    }

    // ── Modal shell ────────────────────────────────────────────────
    function onKeydown(event) {
      if (event.key === "Escape" && !state.sending) closeModal();
    }

    function openModal() {
      if (overlay) return;
      if (state.booked) {
        // A fresh visit after a booking: new pick, new availability.
        state.booked = false;
        state.slot = null;
        state.day = null;
        state.slots = {};
        state.months = {};
        state.month = firstOfMonth(new Date());
      }
      overlay = el("div", "overlay");
      overlay.addEventListener("mousedown", function (event) {
        if (event.target === overlay && !state.sending) closeModal();
      });

      var dlg = el("div", "dlg");
      dlg.setAttribute("role", "dialog");
      dlg.setAttribute("aria-modal", "true");

      var close = el("button", "close");
      // Lucide X.
      close.innerHTML =
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      close.setAttribute("aria-label", "Close");
      close.addEventListener("click", function () {
        if (!state.sending) closeModal();
      });
      dlg.appendChild(close);

      content = el("div", "content");
      dlg.appendChild(content);
      overlay.appendChild(dlg);
      wrap.appendChild(overlay);

      document.addEventListener("keydown", onKeydown);
      document.documentElement.style.overflow = "hidden";
      render();
      close.focus();
      loadMonth();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (overlay) overlay.classList.add("open");
        });
      });
    }

    function closeModal() {
      if (!overlay) return;
      var node = overlay;
      overlay = null;
      content = null;
      node.classList.remove("open");
      document.removeEventListener("keydown", onKeydown);
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        node.remove();
      }, 170);
      if (host.focus) host.focus();
    }

    // ── Data ───────────────────────────────────────────────────────
    function monthKey(d) {
      return d.getFullYear() + "-" + d.getMonth();
    }

    /** Fetch the visible month's availability (from today onward). */
    function loadMonth() {
      if (!state.config) return;
      var mk = monthKey(state.month);
      if (state.months[mk]) return;
      var fromMs = Math.max(state.month.getTime(), startOfToday());
      var toMs = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1).getTime();
      if (toMs <= fromMs) {
        state.months[mk] = true;
        return;
      }
      fetch(endpoint + "?from=" + encodeURIComponent(new Date(fromMs).toISOString()) + "&to=" + encodeURIComponent(new Date(toMs).toISOString()))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          // The owner's calendar can't be read right now: no slots to trust.
          if (data.unavailable) throw new Error("unavailable");
          (data.slots || []).forEach(function (iso) {
            var k = dayKey(new Date(iso).getTime());
            (state.slots[k] = state.slots[k] || []).push(iso);
          });
          for (var ms = fromMs; ms < toMs; ms += DAY) {
            var k2 = dayKey(ms);
            state.slots[k2] = state.slots[k2] || [];
          }
          state.months[mk] = true;
          render();
        })
        .catch(function () {
          if (!content) return;
          content.textContent = "";
          content.appendChild(el("p", "empty", "Online booking is not available right now. Please contact us directly."));
        });
    }

    // ── Views ──────────────────────────────────────────────────────
    function render() {
      if (!content) return;
      content.textContent = "";
      if (!state.config) {
        content.appendChild(
          el("p", "empty", "Online booking is not available right now. Please contact us directly.")
        );
        return;
      }
      if (state.booked) return renderDone();
      if (state.slot) return renderForm();
      renderMain();
    }

    function infoPane(selectedTime) {
      var info = el("div", "pane info");
      var site = state.config.site || "";
      var av = el("div", "avatar", (site[0] || "B"));
      info.appendChild(av);
      if (site) info.appendChild(el("div", "site", site));
      info.appendChild(el("h3", null, state.type ? state.type.name : "Book an appointment"));

      // Type picker lives in the summary panel, like Cal.com's event list.
      if (!presetType && state.config.types.length > 1 && !selectedTime) {
        var list = el("div", "typelist");
        state.config.types.forEach(function (type) {
          var b = el("button", "type" + (state.type === type ? " on" : ""));
          b.appendChild(el("div", "t", type.name));
          if (type.description) b.appendChild(el("div", "d", type.description));
          b.addEventListener("click", function () {
            state.type = type;
            state.slot = null;
            render();
          });
          list.appendChild(b);
        });
        info.appendChild(list);
      } else if (state.type && state.type.description) {
        var desc = el("div", "site", state.type.description);
        desc.style.margin = "-8px 0 12px";
        info.appendChild(desc);
      }

      info.appendChild(meta("clock", (state.config.minutes || 15) + "m"));
      if (state.type && state.type.meet) info.appendChild(meta("video", "Google Meet"));
      var tz = "";
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {}
      if (tz) info.appendChild(meta("globe", tz));
      if (selectedTime) {
        var when = meta("clock", selectedTime);
        when.style.color = T.fg;
        when.style.fontWeight = "600";
        info.appendChild(when);
      }
      return info;
    }

    function renderMain() {
      var panes = el("div", "panes");
      panes.appendChild(infoPane(null));

      // ── Month calendar ──
      var cal = el("div", "cal");
      var head = el("div", "calhead");
      var m = el("div", "m", monthFmt.format(state.month) + " ");
      m.appendChild(el("span", null, String(state.month.getFullYear())));
      head.appendChild(m);
      var navs = el("div");
      var prev = el("button", "nav", "‹");
      prev.disabled = state.month <= firstOfMonth(new Date());
      prev.addEventListener("click", function () {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
        state.day = null;
        render();
        loadMonth();
      });
      var next = el("button", "nav", "›");
      // Months fully past the booking horizon have no times; don't offer them.
      var nextMonthStart = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1).getTime();
      next.disabled =
        nextMonthStart >
        startOfToday() + ((state.config.horizonDays || 30) + 1) * DAY;
      next.addEventListener("click", function () {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
        state.day = null;
        render();
        loadMonth();
      });
      navs.appendChild(prev);
      navs.appendChild(next);
      head.appendChild(navs);
      cal.appendChild(head);

      var monthLoaded = state.months[monthKey(state.month)];
      var grid = el("div", "grid" + (monthLoaded ? "" : " loading"));
      WEEKDAYS.forEach(function (wd) {
        grid.appendChild(el("div", "wd", wd));
      });
      var firstDay = new Date(state.month.getFullYear(), state.month.getMonth(), 1);
      for (var pad = 0; pad < firstDay.getDay(); pad++) grid.appendChild(el("div"));
      var daysInMonth = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();
      for (var dnum = 1; dnum <= daysInMonth; dnum++) {
        (function (dnum) {
          var ms = new Date(state.month.getFullYear(), state.month.getMonth(), dnum).getTime();
          var k = dayKey(ms);
          var has = Boolean(state.slots[k] && state.slots[k].length);
          var d = el("button", "day" + (has ? " has" : "") + (state.day === k ? " on" : ""), String(dnum));
          if (has) {
            d.addEventListener("click", function () {
              state.day = k;
              render();
            });
          } else {
            d.disabled = true;
          }
          grid.appendChild(d);
        })(dnum);
      }
      cal.appendChild(grid);
      panes.appendChild(cal);

      // ── Day times ──
      var times = el("div", "pane times");
      if (state.day) {
        var headRow = el("div", "timehead");
        var parts = state.day.split("-");
        var dayDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        var dlabel = el("div", "d", weekdayFmt.format(dayDate) + " ");
        dlabel.appendChild(el("span", null, String(dayDate.getDate())));
        headRow.appendChild(dlabel);
        var fmt = el("div", "fmt");
        [["12h", true], ["24h", false]].forEach(function (opt) {
          var b = el("button", state.hour12 === opt[1] ? "on" : "", opt[0]);
          b.addEventListener("click", function () {
            state.hour12 = opt[1];
            render();
          });
          fmt.appendChild(b);
        });
        headRow.appendChild(fmt);
        times.appendChild(headRow);

        var col = el("div", "slotcol");
        var tf = timeFmt();
        (state.slots[state.day] || []).sort().forEach(function (iso) {
          var b = el("button", null, tf.format(new Date(iso)));
          b.addEventListener("click", function () {
            state.slot = iso;
            render();
          });
          col.appendChild(b);
        });
        times.appendChild(col);
      } else if (!monthLoaded) {
        times.appendChild(el("div", "spin"));
      } else {
        var anyDay = Object.keys(state.slots).some(function (k) {
          return (
            k.indexOf(dayKey(state.month.getTime()).slice(0, 8)) === 0 &&
            state.slots[k].length
          );
        });
        times.appendChild(
          el(
            "p",
            "empty",
            anyDay ? "Pick a day to see times." : "No free times this month."
          )
        );
      }
      panes.appendChild(times);
      content.appendChild(panes);
    }

    function renderForm() {
      var panes = el("div", "formgrid");
      panes.appendChild(infoPane(longFmt.format(new Date(state.slot))));

      var paneRight = el("div", "pane");
      var back = el("button", "back", "← Pick a different time");
      back.addEventListener("click", function () {
        state.slot = null;
        render();
      });
      paneRight.appendChild(back);

      var form = el("form");
      function field(labelText, name, type, required) {
        form.appendChild(el("label", null, labelText));
        var input = el(type === "textarea" ? "textarea" : "input");
        if (type !== "textarea") input.type = type;
        input.name = name;
        if (required) input.required = true;
        form.appendChild(input);
        return input;
      }
      var nameInput = field("Name", "name", "text", true);
      var emailInput = field("Email", "email", "email", true);
      var phoneInput = field("Phone (optional)", "phone", "tel", false);
      var notesInput = field("Anything we should know? (optional)", "notes", "textarea", false);
      var hp = el("input", "hp");
      hp.type = "text";
      hp.name = "_hp";
      hp.tabIndex = -1;
      hp.autocomplete = "off";
      form.appendChild(hp);

      var cta = el("button", "cta", "Confirm booking");
      form.appendChild(cta);
      var err = el("p", "err", "");
      err.style.display = "none";
      form.appendChild(err);

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (state.sending) return;
        state.sending = true;
        cta.disabled = true;
        cta.textContent = "Booking…";
        err.style.display = "none";

        var attr = attribution();
        var first = readCookie("_lead_ft");
        var tz = null;
        try {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {}

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            typeId: state.type.id,
            at: state.slot,
            name: nameInput.value,
            email: emailInput.value,
            phone: phoneInput.value || undefined,
            notes: notesInput.value || undefined,
            timezone: tz || undefined,
            pageUrl: location.href,
            landingPage: attr.landing,
            referrer: attr.referrer,
            firstTouch: first || undefined,
            clickAt: attr.clickAt,
            gclid: attr.gclid,
            gbraid: attr.gbraid,
            wbraid: attr.wbraid,
            utm: {
              source: attr.utm_source,
              medium: attr.utm_medium,
              campaign: attr.utm_campaign,
              id: attr.utm_id,
              term: attr.utm_term,
              content: attr.utm_content,
            },
            hp: hp.value || undefined,
            t: Date.now() - loadedAt,
          }),
        })
          .then(function (res) {
            return res.json().then(function (data) {
              if (res.ok) {
                state.booked = true;
                render();
                return;
              }
              if (res.status === 409 && data && data.taken) {
                // Slot got taken: clear this day's slots and send them back.
                var k = dayKey(new Date(state.slot).getTime());
                delete state.slots[k];
                delete state.months[monthKey(state.month)];
                state.slot = null;
                state.day = null;
                render();
                loadMonth();
                return;
              }
              throw new Error((data && data.error) || "failed");
            });
          })
          .catch(function () {
            err.textContent = "Something went wrong. Please try again or contact us directly.";
            err.style.display = "block";
            cta.disabled = false;
            cta.textContent = "Confirm booking";
          })
          .finally(function () {
            state.sending = false;
          });
      });
      paneRight.appendChild(form);
      panes.appendChild(paneRight);
      content.appendChild(panes);
      nameInput.focus();
    }

    function renderDone() {
      var ok = el("div", "ok");
      ok.appendChild(el("div", "big", "✓"));
      ok.appendChild(el("h4", null, "You're booked"));
      ok.appendChild(el("p", null, longFmt.format(new Date(state.slot)) + " · " + state.type.name));
      ok.appendChild(el("p", null, "A calendar invite is on its way to your email."));
      content.appendChild(ok);
    }

    // ── Boot: the site's own element is the trigger; we only open the popup.
    host.addEventListener("click", function (event) {
      event.preventDefault();
      openModal();
    });
    fetch(endpoint)
      .then(function (res) { return res.json(); })
      .then(function (config) {
        if (!config || config.unavailable || !config.types || !config.types.length) return;
        state.config = config;
        if (presetType) {
          state.type = config.types.filter(function (t) { return t.id === presetType; })[0] || null;
        }
        if (!state.type) state.type = config.types[0];
        render();
      })
      .catch(function () {});
  }

  function boot() {
    var hosts = document.querySelectorAll("[data-booking]");
    for (var i = 0; i < hosts.length; i++) {
      // Bind each trigger once, even if boot runs again (SPA navigations).
      if (hosts[i].__bkBound) continue;
      hosts[i].__bkBound = true;
      setup(hosts[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  // Astro View Transitions / other client routers swap the DOM without a full
  // load; re-scan so triggers on the new page get bound.
  document.addEventListener("astro:page-load", boot);
})();

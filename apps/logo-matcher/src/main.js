import "./style.css";

const app = document.querySelector("#app");
const STORAGE_KEY = "logo-matcher:rows";
const THEME_KEY = "logo-matcher:theme";

const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

app.innerHTML = `
  <header>
    <h1>Logo Matcher</h1>
    <div class="header-actions">
      <button id="theme-toggle" title="Toggle theme"></button>
      <button id="add-row">+ Add pair</button>
    </div>
  </header>`;

const themeToggle = document.querySelector("#theme-toggle");
function renderThemeIcon() {
  const t = document.documentElement.getAttribute("data-theme");
  themeToggle.textContent = t === "dark" ? "☀️" : "🌙";
}
renderThemeIcon();
themeToggle.addEventListener("click", () => {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  renderThemeIcon();
});

app.insertAdjacentHTML(
  "beforeend",
  `
  <div class="columns-head">
    <div>Original</div>
    <div>New (match this)</div>
    <div></div>
  </div>
  <div class="rows" id="rows"></div>
`,
);

const rows = document.querySelector("#rows");

// ---- gallery picker: browse everything in the logos dir, click to assign ----
const gallery = document.createElement("div");
gallery.className = "gallery-overlay";
gallery.innerHTML = `
  <div class="gallery-panel">
    <div class="gallery-head">
      <span>Pick a logo</span>
      <button class="gallery-close" type="button">×</button>
    </div>
    <div class="gallery-grid"></div>
  </div>
`;
app.appendChild(gallery);
const galleryGrid = gallery.querySelector(".gallery-grid");
let galleryCb = null;

function closeGallery() {
  gallery.classList.remove("open");
  galleryCb = null;
}

async function openGallery(onPick) {
  galleryCb = onPick;
  galleryGrid.innerHTML = `<div class="gallery-empty">Loading…</div>`;
  gallery.classList.add("open");
  let files = [];
  try {
    files = (await (await fetch("/api/logos")).json()).files || [];
  } catch {
    galleryGrid.innerHTML = `<div class="gallery-empty">Failed to load library.</div>`;
    return;
  }
  if (!files.length) {
    galleryGrid.innerHTML = `<div class="gallery-empty">No logos yet. Upload one first.</div>`;
    return;
  }
  galleryGrid.innerHTML = "";
  files.forEach((name) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "gallery-item";
    item.innerHTML = `<img src="/logos/${name}" alt="" /><span>${name}</span>`;
    item.addEventListener("click", () => {
      const cb = galleryCb;
      closeGallery();
      cb?.(name);
    });
    galleryGrid.appendChild(item);
  });
}

gallery.querySelector(".gallery-close").addEventListener("click", closeGallery);
gallery.addEventListener("click", (e) => {
  if (e.target === gallery) closeGallery();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && gallery.classList.contains("open")) closeGallery();
});

function save() {
  const data = [...rows.children].map((row) => ({
    id: row.dataset.id,
    original: row._slots.original.getPath(),
    new: row._slots.new.getPath(),
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage full or unavailable", e);
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

const NS_SVG = "http://www.w3.org/2000/svg";

// is a fill value effectively white?
function isWhiteFill(el) {
  const v = (el.getAttribute("fill") || el.style.fill || "")
    .trim()
    .toLowerCase();
  return (
    v === "white" ||
    v === "#fff" ||
    v === "#ffffff" ||
    v === "rgb(255,255,255)" ||
    v === "rgb(255, 255, 255)"
  );
}

// remove full-canvas white background rects (the ones that pad the artwork)
function stripBackground(svgEl, vbW, vbH) {
  svgEl.querySelectorAll("rect").forEach((r) => {
    const w = parseFloat(r.getAttribute("width"));
    const h = parseFloat(r.getAttribute("height"));
    if (
      w >= 0.95 * vbW &&
      h >= 0.95 * vbH &&
      isWhiteFill(r) &&
      r.parentNode
    ) {
      r.parentNode.removeChild(r);
    }
  });
}

// measure tight bbox of the artwork by rendering offscreen
function measureBBox(svgEl) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("width", "1000");
  clone.setAttribute("height", "1000");
  clone.style.cssText =
    "position:absolute;left:-99999px;top:0;opacity:0;pointer-events:none";
  document.body.appendChild(clone);
  let box = null;
  try {
    const b = clone.getBBox();
    if (b && b.width > 0 && b.height > 0) box = b;
  } catch {
    /* getBBox can throw on empty/unsupported content */
  }
  document.body.removeChild(clone);
  return box;
}

// wrap an svg into a 1024×1024 app-icon canvas: strip the white background,
// crop to the real logo, and fit it to a centered 780px box
function normalizeSvg(text) {
  const CANVAS = 1024;
  const ART = 780;
  const PAD = (CANVAS - ART) / 2; // 122

  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const src = doc.documentElement;
  if (src.nodeName !== "svg" || doc.querySelector("parsererror")) return text;

  let vbW, vbH, vbX = 0, vbY = 0;
  const vbAttr = src.getAttribute("viewBox");
  if (vbAttr) {
    [vbX, vbY, vbW, vbH] = vbAttr.split(/[\s,]+/).map(Number);
  } else {
    vbW = parseFloat(src.getAttribute("width"));
    vbH = parseFloat(src.getAttribute("height"));
  }

  const inner = src.cloneNode(true);
  inner.removeAttribute("width");
  inner.removeAttribute("height");

  // drop full-canvas white backgrounds, then crop to the artwork itself
  if (vbW && vbH) stripBackground(inner, vbW, vbH);
  const box = measureBBox(inner);
  const crop = box
    ? `${box.x} ${box.y} ${box.width} ${box.height}`
    : `${vbX} ${vbY} ${vbW} ${vbH}`;
  inner.setAttribute("viewBox", crop);

  inner.setAttribute("x", String(PAD));
  inner.setAttribute("y", String(PAD));
  inner.setAttribute("width", String(ART));
  inner.setAttribute("height", String(ART));
  inner.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const wrap = document.createElementNS(NS_SVG, "svg");
  wrap.setAttribute("xmlns", NS_SVG);
  wrap.setAttribute("width", String(CANVAS));
  wrap.setAttribute("height", String(CANVAS));
  wrap.setAttribute("viewBox", `0 0 ${CANVAS} ${CANVAS}`);
  const bg = document.createElementNS(NS_SVG, "rect");
  bg.setAttribute("width", String(CANVAS));
  bg.setAttribute("height", String(CANVAS));
  bg.setAttribute("fill", "#ffffff");
  wrap.append(bg, inner);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(wrap)
  );
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// write file to disk via dev endpoint, return served path
async function uploadToDisk(id, dataUrl) {
  const res = await fetch("/api/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, dataUrl }),
  });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).path;
}

function deleteFromDisk(path) {
  if (!path) return;
  const name = path.split("/").pop();
  fetch(`/api/logos?name=${encodeURIComponent(name)}`, { method: "DELETE" });
}

function makeSlot(label, side, rowId, initialPath) {
  const cell = document.createElement("div");
  cell.className = "cell";

  const slot = document.createElement("label");
  slot.className = "slot";
  slot.innerHTML = `
    <span class="placeholder">Click or drop ${label} logo</span>
    <input type="file" accept="image/*" />
    <button class="gallery-btn" type="button" title="Pick from library">⊞</button>
    <button class="clear" type="button">×</button>
  `;

  const caption = document.createElement("div");
  caption.className = "filename";
  caption.textContent = "—";

  const actions = document.createElement("div");
  actions.className = "actions";
  const dl = document.createElement("a");
  dl.className = "act";
  dl.textContent = "↓ Download";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "act";
  copy.textContent = "⧉ Copy";
  actions.append(dl, copy);

  const flash = (btn, txt, orig) => {
    btn.textContent = txt;
    setTimeout(() => (btn.textContent = orig), 1500);
  };

  // point Download/Copy at the given served path (the useful/displayed file)
  function setActions(p) {
    if (!p || !p.startsWith("/logos/")) {
      actions.style.display = "none";
      return;
    }
    const name = p.split("/").pop();
    const isSvg = name.endsWith(".svg");
    actions.style.display = "flex";
    copy.textContent = "⧉ Copy";

    if (isSvg) {
      // rebuild as a 1024×1024 app icon (artwork fit to 780px, centered)
      dl.removeAttribute("href");
      dl.onclick = async (e) => {
        e.preventDefault();
        const out = normalizeSvg(await (await fetch(p)).text());
        const url = URL.createObjectURL(
          new Blob([out], { type: "image/svg+xml" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      };
      copy.onclick = async () => {
        const out = normalizeSvg(await (await fetch(p)).text());
        await navigator.clipboard.writeText(out);
        flash(copy, "✓ Copied", "⧉ Copy");
      };
    } else {
      // raster: download raw file, copy image blob to clipboard
      dl.href = p;
      dl.download = name;
      dl.onclick = null;
      copy.onclick = async () => {
        try {
          const blob = await (await fetch(p)).blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          flash(copy, "✓ Copied", "⧉ Copy");
        } catch {
          await navigator.clipboard.writeText(name);
          flash(copy, "✓ Name copied", "⧉ Copy");
        }
      };
    }
  }
  setActions(null);

  cell.appendChild(slot);
  cell.appendChild(caption);
  cell.appendChild(actions);

  const input = slot.querySelector("input");
  const clear = slot.querySelector(".clear");
  const galleryBtn = slot.querySelector(".gallery-btn");
  let path = null;

  galleryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openGallery((name) => {
      setImage(`/logos/${name}`, false);
      save();
    });
  });

  const bust = (p) => `${p}?t=${Math.floor(performance.now())}`;
  const matchedPathOf = (p) => {
    const dot = p.lastIndexOf(".");
    return `${p.slice(0, dot)}-MATCHED${p.slice(dot)}`;
  };

  // remove any rendered visual (single img or compare widget)
  function clearVisual() {
    slot.querySelectorAll("img, .compare, .toggle").forEach((el) => el.remove());
  }

  function reset() {
    path = null;
    clearVisual();
    slot.querySelector(".placeholder").style.display = "";
    slot.classList.remove("filled");
    caption.textContent = "—";
    setActions(null);
    input.value = "";
  }

  function setImage(p, cacheBust) {
    path = p;
    clearVisual();
    slot.querySelector(".placeholder").style.display = "none";
    const img = document.createElement("img");
    // only served /logos/ paths get a cache-bust; never mangle data: URLs
    img.src = cacheBust && p.startsWith("/logos/") ? bust(p) : p;
    // missing file on disk -> drop back to placeholder + persist
    img.onerror = () => {
      reset();
      save();
    };
    slot.insertBefore(img, clear);
    slot.classList.add("filled");
    caption.textContent = p.startsWith("/logos/")
      ? p.split("/").pop()
      : "(unsaved)";
    setActions(p);

    // NEW side: if a *-MATCHED file exists on disk, offer before/after compare
    if (side === "new" && p.startsWith("/logos/")) probeMatched(p);
  }

  // check disk for a matched recolor; if present, swap in the compare widget
  function probeMatched(p) {
    const matched = matchedPathOf(p);
    const test = new Image();
    test.onload = () => {
      if (path === p) buildCompare(p, matched);
    };
    test.src = bust(matched);
  }

  // before/after: base = uploaded new logo, top = my recolored match.
  // slider reveals on mouse move; toggle cycles Slider / New / Matched.
  function buildCompare(newP, matchedP) {
    clearVisual();

    const compare = document.createElement("div");
    compare.className = "compare";
    const base = document.createElement("img");
    base.className = "layer base";
    base.src = bust(newP);
    const top = document.createElement("img");
    top.className = "layer top";
    top.src = bust(matchedP);
    const handle = document.createElement("div");
    handle.className = "handle";
    compare.append(base, top, handle);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "toggle";

    const MODES = ["slider", "new", "matched"];
    const LABELS = { slider: "⇔ Slider", new: "Old", matched: "Matched" };
    let mode = "slider";

    function apply(pct) {
      if (mode === "new") {
        top.style.clipPath = "inset(0 100% 0 0)";
        handle.style.display = "none";
      } else if (mode === "matched") {
        top.style.clipPath = "inset(0 0 0 0)";
        handle.style.display = "none";
      } else {
        top.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        handle.style.display = "block";
        handle.style.left = `${pct}%`;
      }
    }

    let lastPct = 50;
    apply(lastPct);
    toggle.textContent = LABELS[mode];

    compare.addEventListener("mousemove", (e) => {
      if (mode !== "slider") return;
      const r = compare.getBoundingClientRect();
      lastPct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      apply(lastPct);
    });

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      toggle.textContent = LABELS[mode];
      apply(lastPct);
    });

    slot.insertBefore(compare, clear);
    slot.insertBefore(toggle, clear);
    slot.classList.add("filled");
    caption.textContent = `${newP.split("/").pop()}  ·  vs  ·  ${matchedP
      .split("/")
      .pop()}`;
    setActions(matchedP); // download/copy the matched recolor
  }

  async function load(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataURL(file);
    const savedPath = await uploadToDisk(`${rowId}-${side}`, dataUrl);
    setImage(savedPath, true);
    save();
  }

  if (initialPath) setImage(initialPath, false);

  input.addEventListener("change", (e) => load(e.target.files[0]));

  clear.addEventListener("click", (e) => {
    e.preventDefault();
    if (!path) return reset();
    const name = path.startsWith("/logos/") ? path.split("/").pop() : "this image";
    if (!window.confirm(`Delete ${name} from disk? This cannot be undone.`)) return;
    deleteFromDisk(path);
    reset();
    save();
  });

  slot.addEventListener("dragover", (e) => {
    e.preventDefault();
    slot.classList.add("dragover");
  });
  slot.addEventListener("dragleave", () => slot.classList.remove("dragover"));
  slot.addEventListener("drop", (e) => {
    e.preventDefault();
    slot.classList.remove("dragover");
    load(e.dataTransfer.files[0]);
  });

  cell.getPath = () => path;
  return cell;
}

function addRow(data = {}) {
  const id = data.id || crypto.randomUUID();
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.id = id;
  const original = makeSlot("original", "original", id, data.original);
  const newer = makeSlot("new", "new", id, data.new);
  row._slots = { original, new: newer };
  row.appendChild(original);
  row.appendChild(newer);
  const del = document.createElement("button");
  del.className = "del-row";
  del.textContent = "🗑";
  del.title = "Remove pair";
  del.addEventListener("click", () => {
    const files = [original.getPath(), newer.getPath()].filter(Boolean);
    const msg = files.length
      ? `Remove this pair and delete ${files.length} file(s) from disk?\n\n${files
          .map((p) => p.split("/").pop())
          .join("\n")}\n\nThis cannot be undone.`
      : "Remove this empty pair?";
    if (!window.confirm(msg)) return;
    files.forEach(deleteFromDisk);
    row.remove();
    save();
  });
  row.appendChild(del);
  rows.appendChild(row);
}

document.querySelector("#add-row").addEventListener("click", () => {
  addRow();
  save();
});

const saved = load();
if (saved.length) {
  saved.forEach((d) => addRow(d));
} else {
  addRow();
}

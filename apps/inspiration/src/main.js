import library from "virtual:inspiration";

// dev server = paste/drop/delete; built dist/index.html = read-only gallery
const EDITABLE = import.meta.env.DEV;

const grid = document.getElementById("grid");
const heading = document.getElementById("heading");
const count = document.getElementById("count");
const hint = document.getElementById("hint");
const crumbs = document.getElementById("crumbs");
const filter = document.getElementById("filter");
const newFolderBtn = document.getElementById("new-folder");
const deleteFolderBtn = document.getElementById("delete-folder");
const newPromptBtn = document.getElementById("new-prompt");
const tabs = document.querySelectorAll(".tabs a");
const promptDialog = document.getElementById("prompt-dialog");
const promptForm = promptDialog.querySelector("form");
const toastEl = document.getElementById("toast");
const lightbox = document.getElementById("lightbox");

let folders = library.folders; // tree: { name, path, dirPath, files, children }
let prompts = library.prompts;
let editing = null; // prompt open in the dialog, null = new

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

// folder.dirPath = on-disk names with order prefix, e.g. "01. Hero Sections/01. Pest Control"
function src(folder, name) {
  return `./inspiration/${encodePath(folder.dirPath)}/${name}`;
}

function href(folder) {
  return `#/${encodePath(folder.path)}`;
}

// last path segment = on-disk slug without the order prefix, e.g. "pest-control"
function slugOf(folder) {
  return folder.path.split("/").pop();
}

function* walk(nodes) {
  for (const node of nodes) {
    yield node;
    yield* walk(node.children);
  }
}

function findFolder(path) {
  for (const node of walk(folders)) if (node.path === path) return node;
  return null;
}

// own images first, then subfolders', for folder covers and counts
function* imagesIn(folder) {
  for (const file of folder.files) yield { folder, file };
  for (const child of folder.children) yield* imagesIn(child);
}

function countImages(folder) {
  let n = 0;
  for (const _ of imagesIn(folder)) n++;
  return n;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// #/<path> = folder view, #prompts = prompts, anything else = home
function currentFolder() {
  if (!location.hash.startsWith("#/")) return null;
  return findFolder(location.hash.slice(2).split("/").map(decodeURIComponent).join("/"));
}

function onPrompts() {
  return location.hash === "#prompts";
}

function render() {
  const folder = currentFolder();
  const view = folder ? "folder" : onPrompts() ? "prompts" : "home";
  document.body.dataset.view = view;
  document.body.classList.toggle("editable", EDITABLE);
  for (const t of tabs) {
    t.classList.toggle("active", t.dataset.tab === (view === "prompts" ? "prompts" : "folders"));
  }
  grid.innerHTML = "";
  if (view === "folder") renderFolder(folder);
  else if (view === "prompts") renderPrompts();
  else renderHome();
}

function renderPrompts() {
  const q = filter.value.trim().toLowerCase();
  const shown = prompts.filter((p) => `${p.title}\n${p.body}`.toLowerCase().includes(q));
  document.title = "Prompts · Inspiration";
  heading.textContent = "Prompts";
  count.textContent = prompts.length ? `· ${prompts.length}` : "";
  hint.innerHTML = EDITABLE
    ? "Reusable prompts, one <code>.md</code> file each in <code>apps/inspiration/prompts/</code>."
    : "Read-only. Run <kbd>pnpm dev</kbd> in apps/inspiration to add prompts.";
  grid.className = "prompts";

  if (!shown.length) {
    grid.innerHTML = `<div class="empty">${
      prompts.length ? "No prompts match." : EDITABLE ? "No prompts yet. Click New prompt." : "No prompts yet."
    }</div>`;
    return;
  }
  for (const p of shown) {
    const card = document.createElement("article");
    card.className = "prompt";
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.body)}</p>
      <button type="button" class="copy">Copy</button>`;
    card.onclick = () => openPrompt(p);
    card.querySelector(".copy").onclick = (e) => {
      e.stopPropagation();
      copy(p.body);
    };
    grid.append(card);
  }
}

function openPrompt(p) {
  editing = p;
  promptForm.title.value = p?.title || "";
  promptForm.body.value = p?.body || "";
  promptForm.title.readOnly = promptForm.body.readOnly = !EDITABLE;
  promptDialog.classList.toggle("is-new", !p);
  promptDialog.showModal();
  if (EDITABLE && !p) promptForm.title.focus();
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // file:// in some browsers has no async clipboard
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast("Copied");
}

function folderCard(f, { draggable, showParent }) {
  const a = document.createElement("a");
  a.className = "folder";
  a.href = href(f);
  a.dataset.slug = slugOf(f);
  a.draggable = draggable;
  // first image sits on top, so render the stack back to front
  const covers = [...take(imagesIn(f), 3)];
  const papers = covers
    .map(({ folder, file }, i) => `<img class="paper p${i + 1}" src="${src(folder, file)}" loading="lazy" draggable="false" alt="" />`)
    .reverse()
    .join("");
  const images = countImages(f);
  const meta = [
    f.children.length && plural(f.children.length, "folder"),
    images && plural(images, "image"),
  ].filter(Boolean);
  const parent = showParent && f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "";
  a.innerHTML = `
    <div class="icon">
      <div class="back"></div>
      <div class="papers papers-${covers.length}">${papers}</div>
      <div class="front"></div>
    </div>
    <div class="meta">
      <span class="name">${escapeHtml(f.name)}</span>
      ${parent ? `<span class="n">in ${escapeHtml(parent)}</span>` : ""}
      <span class="n">${meta.join(" · ") || "Empty"}</span>
    </div>`;
  return a;
}

function* take(iter, n) {
  if (n <= 0) return;
  for (const x of iter) {
    yield x;
    if (--n <= 0) return;
  }
}

function section(kind, label) {
  const el = document.createElement("section");
  el.className = kind;
  el.dataset.kind = kind;
  if (label) {
    const h = document.createElement("h2");
    h.className = "section-label";
    h.textContent = label;
    grid.append(h);
  }
  grid.append(el);
  return el;
}

function renderHome() {
  const q = filter.value.trim().toLowerCase();
  const all = [...walk(folders)];
  const total = folders.reduce((n, f) => n + countImages(f), 0);
  document.title = "Inspiration";
  heading.textContent = "Inspiration";
  count.textContent = `· ${plural(all.length, "folder")} · ${plural(total, "image")}`;
  hint.innerHTML = EDITABLE
    ? "Open a folder to paste images with <kbd>⌘V</kbd>. Drag folders to reorder."
    : "Read-only. Run <kbd>pnpm dev</kbd> in apps/inspiration to add images.";
  crumbs.innerHTML = "";
  grid.className = "";

  // filtering searches every level; reordering a filtered list would drop hidden folders
  const shown = q ? all.filter((f) => f.name.toLowerCase().includes(q)) : folders;
  if (!shown.length) {
    grid.innerHTML = `<div class="empty">No folders match.</div>`;
    return;
  }
  const list = section("folders");
  for (const f of shown) list.append(folderCard(f, { draggable: EDITABLE && !q, showParent: !!q }));
}

function renderCrumbs(folder) {
  const parts = folder.path.split("/");
  const links = [`<a href="#">All folders</a>`];
  parts.slice(0, -1).forEach((name, i) => {
    const path = parts.slice(0, i + 1).join("/");
    links.push(`<a href="#/${encodePath(path)}">${escapeHtml(name)}</a>`);
  });
  crumbs.innerHTML = links.join(`<span>/</span>`);
}

function renderFolder(folder) {
  const images = folder.files.length;
  const subs = folder.children.length;
  document.title = `${folder.name} · Inspiration`;
  heading.textContent = folder.name;
  count.textContent = [subs && plural(subs, "folder"), images && plural(images, "image")]
    .filter(Boolean)
    .map((t) => `· ${t}`)
    .join(" ");
  hint.innerHTML = EDITABLE
    ? "<kbd>⌘V</kbd> to paste an image here, or drop files. Add subfolders to organize. Drag to reorder."
    : "Read-only. Run <kbd>pnpm dev</kbd> in apps/inspiration to add images.";
  renderCrumbs(folder);
  grid.className = "";

  if (!images && !subs) {
    grid.innerHTML = `<div class="empty">${
      EDITABLE ? "Empty. Paste an image, or click New folder to add a subfolder." : "Empty."
    }</div>`;
    return;
  }

  if (subs) {
    const list = section("folders", images ? "Folders" : "");
    for (const f of folder.children) list.append(folderCard(f, { draggable: EDITABLE, showParent: false }));
  }
  if (!images) return;

  const list = section("images", subs ? "Images" : "");
  for (const name of folder.files) {
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.file = name;
    item.draggable = EDITABLE;
    item.innerHTML = `<img src="${src(folder, name)}" loading="lazy" draggable="false" alt="" />`;
    item.onclick = () => {
      lightbox.querySelector("img").src = src(folder, name);
      lightbox.showModal();
    };
    const tools = document.createElement("div");
    tools.className = "tools";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.title = "Copy image";
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyImage(item.querySelector("img"));
    };
    tools.append(copyBtn);
    item.append(tools);
    if (EDITABLE) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.title = "Delete image";
      del.innerHTML = TRASH_ICON;
      del.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Delete this image?")) return;
        await api(
          `/api/images?folder=${encodeURIComponent(folder.path)}&name=${encodeURIComponent(name)}`,
          { method: "DELETE" },
        );
        await refresh();
      };
      tools.append(del);
    }
    list.append(item);
  }
}

const COPY_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const TRASH_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;

// clipboard only reliably takes PNG, so redraw webp/jpg/gif through a canvas.
// ClipboardItem gets the promise synchronously so Safari keeps the user gesture
function copyImage(img) {
  const png = new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/png");
  });
  navigator.clipboard
    .write([new ClipboardItem({ "image/png": png })])
    .then(() => toast("Image copied"))
    // opened from file://, the canvas is tainted and can't be read
    .catch(() => toast("Can't copy here. Right-click → Copy Image"));
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

async function api(url, init) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

async function refresh() {
  const [f, p] = await Promise.all([api("/api/folders"), api("/api/prompts")]);
  folders = f.folders;
  prompts = p.prompts;
  render();
}

// server renames files to keep order, so reload the list after every write
async function saveTo(folder, request) {
  await request;
  await refresh();
  toast(`Saved to ${folder.name}`);
}

// drag-and-drop reorder; the server renames folders/files so disk order matches
let dragged = null;

grid.addEventListener("dragstart", (e) => {
  const el = e.target.closest?.("[draggable=true]");
  if (!el) return;
  dragged = el;
  el.classList.add("is-dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("application/x-reorder", "");
});

grid.addEventListener("dragover", (e) => {
  if (!dragged) return;
  e.preventDefault();
  const over = e.target.closest("[draggable=true]");
  // folders and images reorder within their own section only
  if (!over || over === dragged || over.parentElement !== dragged.parentElement) return;
  const r = over.getBoundingClientRect();
  over[e.clientX > r.left + r.width / 2 ? "after" : "before"](dragged);
});

grid.addEventListener("dragend", async () => {
  if (!dragged) return;
  const container = dragged.parentElement;
  dragged.classList.remove("is-dragging");
  dragged = null;
  const els = [...container.children];
  const folder = currentFolder();
  const path = folder?.path || "";
  const isImages = container.dataset.kind === "images";
  const after = els.map((el) => (isImages ? el.dataset.file : el.dataset.slug));
  const before = isImages ? folder.files : (folder?.children || folders).map(slugOf);
  if (JSON.stringify(after) === JSON.stringify(before)) return;
  const body = isImages ? { path, files: after } : { path, names: after };
  try {
    folders = (await api("/api/order", { method: "PUT", body: JSON.stringify(body) })).folders;
  } catch (err) {
    toast(`Failed: ${err.message}`);
  }
  render();
});

// "Copy image" gives a file; copying a selection gives HTML with <img src>
function imageUrlFromHtml(html) {
  const img = new DOMParser().parseFromString(html, "text/html").querySelector("img[src]");
  return img && /^https?:/.test(img.src) ? img.src : null;
}

async function handle(dataTransfer) {
  const folder = currentFolder();
  if (!folder) return toast("Open a folder first");
  const base = `/api/images?folder=${encodeURIComponent(folder.path)}`;
  const blobs = [...dataTransfer.files].filter((f) => f.type.startsWith("image/"));
  try {
    if (blobs.length) {
      for (const blob of blobs) {
        await saveTo(
          folder,
          api(base, { method: "POST", headers: { "Content-Type": blob.type }, body: blob }),
        );
      }
      return;
    }
    const html = dataTransfer.getData("text/html");
    const url =
      (html && imageUrlFromHtml(html)) ||
      dataTransfer.getData("text/uri-list").split("\n")[0].trim() ||
      dataTransfer.getData("text/plain").trim();
    if (/^https?:\/\/\S+$/.test(url)) {
      return await saveTo(folder, api(`${base}&url=${encodeURIComponent(url)}`, { method: "POST" }));
    }
    toast("No image found in clipboard");
  } catch (e) {
    toast(`Failed: ${e.message}`);
  }
}

if (EDITABLE) {
  document.addEventListener("paste", (e) => {
    if (e.target.closest("input, textarea") || onPrompts()) return;
    e.preventDefault();
    handle(e.clipboardData);
  });

  let depth = 0;
  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    if (dragged || !currentFolder()) return;
    depth++;
    document.body.classList.add("dragging");
  });
  document.addEventListener("dragleave", () => {
    if (depth && --depth === 0) document.body.classList.remove("dragging");
  });
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    if (dragged) return;
    depth = 0;
    document.body.classList.remove("dragging");
    handle(e.dataTransfer);
  });

  // creates inside the open folder (or top level on home)
  newFolderBtn.onclick = async () => {
    const parent = currentFolder();
    const name = prompt(parent ? `New folder inside "${parent.name}"` : "Folder name")?.trim();
    if (!name) return;
    try {
      const qs = `name=${encodeURIComponent(name)}&parent=${encodeURIComponent(parent?.path || "")}`;
      const { slug } = await api(`/api/folders?${qs}`, { method: "POST" });
      await refresh();
      toast(`Created ${slug}`);
    } catch (e) {
      toast(`Failed: ${e.message}`);
    }
  };

  newPromptBtn.onclick = () => openPrompt(null);

  promptForm.onsubmit = async (e) => {
    e.preventDefault();
    const payload = JSON.stringify({ title: promptForm.title.value, body: promptForm.body.value });
    try {
      if (editing) {
        await api(`/api/prompts?id=${editing.id}`, { method: "PUT", body: payload });
      } else {
        await api("/api/prompts", { method: "POST", body: payload });
      }
      promptDialog.close();
      await refresh();
      toast("Saved");
    } catch (err) {
      toast(`Failed: ${err.message}`);
    }
  };

  document.getElementById("prompt-delete").onclick = async () => {
    if (!editing || !confirm(`Delete "${editing.title}"?`)) return;
    await api(`/api/prompts?id=${editing.id}`, { method: "DELETE" });
    promptDialog.close();
    await refresh();
  };

  deleteFolderBtn.onclick = async () => {
    const folder = currentFolder();
    if (!folder) return;
    const n = countImages(folder);
    const subs = [...walk(folder.children)].length;
    const what = [subs && plural(subs, "subfolder"), n && plural(n, "image")].filter(Boolean).join(" and ");
    if (!confirm(`Delete "${folder.name}"${what ? ` and its ${what}` : ""}?`)) return;
    await api(`/api/folders?path=${encodeURIComponent(folder.path)}`, { method: "DELETE" });
    const parent = folder.path.includes("/") ? folder.path.slice(0, folder.path.lastIndexOf("/")) : "";
    location.hash = parent ? `#/${encodePath(parent)}` : "";
    await refresh();
  };
}

filter.oninput = render;
window.addEventListener("hashchange", () => {
  window.scrollTo(0, 0);
  filter.value = "";
  render();
});
lightbox.onclick = () => lightbox.close();
document.getElementById("prompt-copy").onclick = () => copy(promptForm.body.value);
document.getElementById("prompt-cancel").onclick = () => promptDialog.close();
// click on backdrop closes
promptDialog.onclick = (e) => {
  if (e.target === promptDialog) promptDialog.close();
};

render();

// baked list is cached by the dev server across reloads, so refresh from disk
if (EDITABLE) refresh();

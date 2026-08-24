/**
 * The whole admin stylesheet as a string, injected once at mount. Keeps the
 * package dependency-free on the styling side — no Tailwind, no CSS imports
 * for the consumer to wire up. WordPress-plain: system fonts, no animation.
 */

export const ADMIN_CSS = `
.sa-root, .sa-root * { box-sizing: border-box; }
.sa-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1d2327;
  background: #f0f0f1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.sa-root button { font: inherit; cursor: pointer; }
.sa-root input, .sa-root textarea, .sa-root select { font: inherit; color: inherit; }

/* Top bar */
.sa-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 48px;
  background: #1d2327;
  color: #f0f0f1;
  flex-shrink: 0;
}
.sa-topbar-title { font-weight: 600; margin-right: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sa-topbar a { color: #9ec2e6; text-decoration: none; }
.sa-topbar a:hover { text-decoration: underline; }
.sa-save {
  background: #2271b1;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 6px 14px;
  font-weight: 600;
}
.sa-save:hover { background: #135e96; }
.sa-save:disabled { background: #3c434a; color: #8c8f94; cursor: default; }

/* Layout */
.sa-body { display: flex; flex: 1; min-height: 0; }
.sa-nav {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #dcdcde;
  padding: 12px 0;
  overflow-y: auto;
}
.sa-nav-heading {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #757575;
  padding: 10px 16px 4px;
}
.sa-nav-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 7px 16px;
  color: #2271b1;
}
.sa-nav-item:hover { background: #f6f7f7; }
.sa-nav-item[data-active="true"] {
  background: #2271b1;
  color: #fff;
  font-weight: 600;
}
.sa-main { flex: 1; overflow-y: auto; padding: 24px; }
.sa-panel {
  background: #fff;
  border: 1px solid #dcdcde;
  border-radius: 4px;
  padding: 20px 24px;
  max-width: 760px;
}
.sa-panel-title { font-size: 20px; font-weight: 600; margin: 0 0 16px; }

/* Fields */
.sa-field { margin-bottom: 16px; }
.sa-label { display: block; font-weight: 600; margin-bottom: 4px; }
.sa-input, .sa-textarea, .sa-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #8c8f94;
  border-radius: 3px;
  background: #fff;
}
.sa-input:focus, .sa-textarea:focus, .sa-select:focus {
  border-color: #2271b1;
  outline: 2px solid rgba(34, 113, 177, 0.25);
}
.sa-textarea { min-height: 96px; resize: vertical; }
.sa-checkbox-row { display: flex; align-items: center; gap: 8px; }
.sa-group {
  border: 1px solid #dcdcde;
  border-radius: 4px;
  padding: 14px 16px 2px;
  margin-bottom: 16px;
}
.sa-group-title { font-weight: 600; margin: 0 0 12px; }
.sa-image-preview {
  display: block;
  max-width: 180px;
  max-height: 110px;
  margin-top: 6px;
  border: 1px solid #dcdcde;
  border-radius: 3px;
  object-fit: cover;
}
.sa-link-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* Lists */
.sa-list-item {
  border: 1px solid #dcdcde;
  border-radius: 4px;
  margin-bottom: 10px;
  background: #fff;
}
.sa-list-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
}
.sa-list-item-label {
  flex: 1;
  font-weight: 600;
  background: none;
  border: none;
  text-align: left;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sa-list-item-body { padding: 12px 12px 0; border-top: 1px solid #dcdcde; }
.sa-icon-btn {
  background: none;
  border: 1px solid #dcdcde;
  border-radius: 3px;
  color: #50575e;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.6;
}
.sa-icon-btn:hover { border-color: #2271b1; color: #2271b1; }
.sa-icon-btn:disabled { opacity: 0.4; cursor: default; }
.sa-add-btn {
  background: none;
  border: 1px dashed #8c8f94;
  border-radius: 3px;
  color: #2271b1;
  padding: 6px 12px;
  width: 100%;
  font-weight: 600;
}
.sa-add-btn:hover { border-color: #2271b1; }

/* States */
.sa-banner {
  border: 1px solid;
  border-left-width: 4px;
  border-radius: 3px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: #fff;
  max-width: 760px;
}
.sa-banner[data-tone="error"] { border-color: #d63638; }
.sa-banner[data-tone="warning"] { border-color: #dba617; }
.sa-banner[data-tone="success"] { border-color: #00a32a; }
.sa-banner-actions { margin-top: 8px; display: flex; gap: 8px; }
.sa-center {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f1;
}
.sa-muted { color: #757575; }
`;

let injected = false;

export const injectStyles = () => {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-site-admin", "");
  style.textContent = ADMIN_CSS;
  document.head.appendChild(style);
  injected = true;
};

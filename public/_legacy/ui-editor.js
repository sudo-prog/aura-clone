/*
 * Aura Clone — UI Editor
 * ------------------------------------------------------------------
 * Loaded from public/_legacy/index.html via
 *   <script type="module" src="/_legacy/ui-editor.js"></script>
 *
 * Adds a hamburger button fixed in the top-left corner. Clicking it opens a
 * dropdown menu with a "Settings" entry pinned to the bottom of the menu.
 * Settings contains a "UI Editor" tool.
 *
 * UI Editor mode:
 *   • Double-click any text on any page to edit it inline.
 *   • Click any element (buttons, images, logos, sections, ...) to select it
 *     and reveal a floating Delete / Edit text toolbar.
 *   • A toolbar at the top of the screen provides:
 *        Back        → undo the previous step (restore text / restore element)
 *        Save & Exit → persist every change and leave the editor
 *   • Edits are saved to localStorage and re-applied automatically as the SPA
 *     navigates between pages, so edits survive reloads and apply everywhere.
 */

const NS = "aura-ui-editor";
const STORAGE_KEY = "aura-clone.ui-editor.v1";
const Z = 2147483630;

const state = {
  mode: "off", // "off" | "edit"
  menuOpen: false,
  screen: "menu", // "menu" | "settings"
  selectedEl: null,
  hoverEl: null,
  editingEl: null,
  editingOriginal: "",
  textEdits: new Map(), // id -> { id, path, originalText, newText, at }
  deletions: new Map(), // id -> { id, path, display, style, at }
  undoStack: [], // { type, title, undo }
  applying: false,
};

/* ------------------------------------------------------------------ */
/* tiny DOM helpers                                                    */
/* ------------------------------------------------------------------ */

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "style" && value && typeof value === "object") {
      Object.assign(node.style, value);
    } else if (key === "html") {
      node.innerHTML = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

/* ------------------------------------------------------------------ */
/* element paths                                                        */
/* ------------------------------------------------------------------ */

function getRoot() {
  return document.getElementById("root") || document.body;
}

function getPath(node) {
  const root = getRoot();
  const parts = [];
  let el = node;
  while (
    el &&
    el.nodeType === 1 &&
    el !== root &&
    el !== document.body &&
    el !== document.documentElement
  ) {
    let index = 0;
    let sibling = el.previousElementSibling;
    while (sibling) {
      index += 1;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift({ tag: (el.tagName || "").toLowerCase(), index });
    el = el.parentElement;
  }
  return parts;
}

function resolvePath(path) {
  let node = getRoot();
  for (const part of path || []) {
    const children = node.children;
    if (!children || part.index >= children.length || !children[part.index]) {
      return null;
    }
    const child = children[part.index];
    if ((child.tagName || "").toLowerCase() !== part.tag) {
      return null;
    }
    node = child;
  }
  return node === getRoot() ? null : node;
}

function pathsEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].tag !== b[i].tag || a[i].index !== b[i].index) return false;
  }
  return true;
}

function findRecordByPath(map, path) {
  for (const record of map.values()) {
    if (pathsEqual(record.path, path)) return record;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* persistence                                                          */
/* ------------------------------------------------------------------ */

function loadState() {
  const textEdits = new Map();
  const deletions = new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.textEdits)) {
        for (const record of parsed.textEdits) {
          if (record && record.id && Array.isArray(record.path)) {
            textEdits.set(record.id, record);
          }
        }
      }
      if (Array.isArray(parsed.deletions)) {
        for (const record of parsed.deletions) {
          if (record && record.id && Array.isArray(record.path)) {
            deletions.set(record.id, record);
          }
        }
      }
    }
  } catch (error) {
    /* Corrupt or unavailable storage — start fresh. */
  }
  return { textEdits, deletions };
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        textEdits: Array.from(state.textEdits.values()),
        deletions: Array.from(state.deletions.values()),
      }),
    );
    return true;
  } catch (error) {
    toast("Could not save changes in this browser.");
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* inline SVG icons (stroke = currentColor)                             */
/* ------------------------------------------------------------------ */

function icon(paths) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" style="width:18px;height:18px;flex:none">' +
    paths +
    "</svg>"
  );
}

const icons = {
  menu: icon(
    '<line x1="3" y1="6" x2="21" y2="6" />' +
      '<line x1="3" y1="12" x2="21" y2="12" />' +
      '<line x1="3" y1="18" x2="21" y2="18" />',
  ),
  close: icon('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
  settings: icon(
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />',
  ),
  back: icon('<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />'),
  uiEditor: icon(
    '<path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />',
  ),
  trash: icon(
    '<path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />' +
      '<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />' +
      '<line x1="10" x2="10" y1="11" y2="17" />' +
      '<line x1="14" x2="14" y1="11" y2="17" />',
  ),
  save: icon('<path d="M12 2v12" /><path d="m16 10-4 4-4-4" /><path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5" />'),
  check: icon('<path d="M20 6 9 17l-5-5" />'),
};
/* ------------------------------------------------------------------ */
/* shared styles + floating UI                                          */
/* ------------------------------------------------------------------ */

function injectStyles() {
  const style = h("style", {
    html:
      "." +
      NS +
      "-row{display:flex;align-items:center;gap:12px;width:100%;padding:11px 12px;" +
      "border:0;border-radius:11px;background:transparent;color:#e4e4e7;font:inherit;" +
      "font-size:14px;text-align:left;cursor:pointer;transition:background .15s ease}" +
      "." +
      NS +
      "-row:hover{background:rgba(255,255,255,.07)}" +
      "." +
      NS +
      "-row-label{flex:1;line-height:1.3}" +
      "." +
      NS +
      "-row-hint{display:block;margin-top:2px;font-size:11.5px;color:#71717a}" +
      "." +
      NS +
      "-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;" +
      "padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:#d4d4d8}" +
      "@keyframes " +
      NS +
      "-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}" +
      "." +
      NS +
      "-panel{animation:" +
      NS +
      "-fade .18s ease both}",
  });
  document.head.append(style);
}

function toast(message, kind) {
  let toastEl = document.getElementById(NS + "-toast");
  if (!toastEl) {
    toastEl = h("div", { id: NS + "-toast" });
    toastEl.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:" +
      (Z + 5) +
      ";display:flex;align-items:center;gap:8px;max-width:86vw;padding:10px 16px;" +
      "border-radius:999px;font-size:13px;color:#fafafa;background:rgba(17,17,19,.96);" +
      "border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 34px rgba(0,0,0,.6);" +
      "pointer-events:none;opacity:0;transition:opacity .22s ease;font-family:inherit";
    document.body.append(toastEl);
  }
  toastEl.innerHTML = kind === "success" ? icons.check : "";
  toastEl.append(document.createTextNode(message));
  toastEl.style.opacity = "1";
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.style.opacity = "0";
  }, 2600);
}

/* overlay outline + floating action bar for the selected element */
let outlineEl;
let actionEl;

function buildOverlay() {
  outlineEl = h("div", { id: NS + "-outline" });
  outlineEl.style.cssText =
    "position:fixed;top:0;left:0;z-index:" +
    (Z + 2) +
    ";pointer-events:none;border:2px dashed rgba(96,165,250,.95);" +
    "background:rgba(96,165,250,.10);display:none;border-radius:4px";
  actionEl = h("div", { id: NS + "-actionbar", ["data-" + NS]: "actionbar" });
  actionEl.style.cssText =
    "position:fixed;z-index:" +
    (Z + 3) +
    ";display:none;flex-direction:column;gap:6px;padding:6px;" +
    "background:rgba(14,14,16,.97);border:1px solid rgba(255,255,255,.14);" +
    "border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.55)";
  document.body.append(outlineEl, actionEl);
}

function actionButton(title, danger, onClick) {
  const btn = h("button", {
    type: "button",
    title,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      padding: "8px 12px",
      border: "0",
      borderRadius: "9px",
      fontSize: "12.5px",
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
      color: danger ? "#fecaca" : "#e4e4e7",
      background: danger ? "rgba(220,38,38,.9)" : "rgba(255,255,255,.09)",
    },
  });
  btn.innerHTML = danger ? icons.trash : icons.uiEditor;
  btn.append(document.createTextNode(title));
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return btn;
}

function updateOverlayPosition() {
  if (!state.selectedEl) {
    outlineEl.style.display = "none";
    actionEl.style.display = "none";
    return;
  }
  const rect = state.selectedEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    outlineEl.style.display = "none";
    actionEl.style.display = "none";
    return;
  }
  outlineEl.style.display = "block";
  outlineEl.style.top = rect.top + "px";
  outlineEl.style.left = rect.left + "px";
  outlineEl.style.width = rect.width + "px";
  outlineEl.style.height = rect.height + "px";
  actionEl.style.display = "flex";
  let top = rect.bottom + 8;
  if (top + 96 > window.innerHeight) {
    top = Math.max(8, rect.top - 96);
  }
  let left = rect.left;
  if (left + 150 > window.innerWidth) {
    left = Math.max(8, window.innerWidth - 150);
  }
  actionEl.style.top = top + "px";
  actionEl.style.left = left + "px";
}

function selectElement(element) {
  commitTextEditing(); // Save any in-progress edit before changing selection.
  state.selectedEl = element;
  updateOverlayPosition();
}

function clearSelection() {
  state.selectedEl = null;
  state.hoverEl = null;
  if (outlineEl) {
    outlineEl.style.display = "none";
    actionEl.style.display = "none";
  }
}
/* ------------------------------------------------------------------ */
/* hamburger button + dropdown menu + settings screen                   */
/* ------------------------------------------------------------------ */

let hamburgerBtn;
let menuPanel;
let menuMainEl;
let settingsEl;

function buildHamburger() {
  hamburgerBtn = h("button", {
    id: NS + "-hamburger",
    type: "button",
    "aria-label": "Open menu",
    title: "Menu",
  });
  hamburgerBtn.style.cssText =
    "position:fixed;top:12px;left:12px;z-index:" +
    (Z + 1) +
    ";width:38px;height:38px;display:flex;align-items:center;justify-content:center;" +
    "border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(12,12,14,.78);" +
    "color:#f4f4f5;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);" +
    "box-shadow:0 4px 18px rgba(0,0,0,.45);transition:background .15s ease";
  hamburgerBtn.innerHTML = icons.menu;
  hamburgerBtn.addEventListener("mouseenter", () => {
    hamburgerBtn.style.background = "rgba(24,24,27,.92)";
  });
  hamburgerBtn.addEventListener("mouseleave", () => {
    hamburgerBtn.style.background = "rgba(12,12,14,.78)";
  });
  hamburgerBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  });
  document.body.append(hamburgerBtn);
}

function menuRow({ iconHtml, label, hint, onClick, bottom }) {
  const row = h("button", { type: "button", class: NS + "-row" });
  if (bottom) row.style.borderTop = "1px solid rgba(255,255,255,.08)";
  const iconWrap = h("span", { style: { color: "#a1a1aa", display: "inline-flex" } });
  iconWrap.innerHTML = iconHtml;
  const labelWrap = h("span", { class: NS + "-row-label" });
  labelWrap.append(document.createTextNode(label));
  if (hint) {
    const hintEl = h("span", { class: NS + "-row-hint" });
    hintEl.append(document.createTextNode(hint));
    labelWrap.append(hintEl);
  }
  row.append(iconWrap, labelWrap);
  row.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return row;
}

function buildMenu() {
  menuPanel = h("div", { id: NS + "-menu", class: NS + "-panel", ["data-" + NS]: "menu" });
  menuPanel.style.cssText =
    "position:fixed;top:58px;left:12px;z-index:" +
    (Z + 2) +
    ";width:274px;display:none;border-radius:16px;padding:6px;" +
    "background:rgba(12,12,14,.97);border:1px solid rgba(255,255,255,.12);" +
    "box-shadow:0 22px 60px rgba(0,0,0,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)";

  /* --- main screen --- */
  menuMainEl = h("div");
  const header = h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px 8px",
      color: "#9ca3af",
      fontSize: "11.5px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
    },
  });
  header.append(document.createTextNode("Menu"));
  const closeBtn = h("button", {
    type: "button",
    "aria-label": "Close menu",
    style: {
      display: "inline-flex",
      padding: "4px",
      border: "0",
      background: "transparent",
      color: "#a1a1aa",
      cursor: "pointer",
      borderRadius: "6px",
    },
  });
  closeBtn.innerHTML = icons.close;
  closeBtn.addEventListener("click", () => closeMenu());
  header.append(closeBtn);

  const notice = h("div", {
    style: {
      padding: "10px 12px",
      margin: "0 4px 8px",
      borderRadius: "10px",
      background: "rgba(255,255,255,.05)",
      color: "#a1a1aa",
      fontSize: "12px",
      lineHeight: 1.5,
    },
  });
  notice.innerHTML = "Aura Clone — site controls.";

  const settingsRow = menuRow({
    iconHtml: icons.settings,
    label: "Settings",
    hint: "Preferences and tools",
    bottom: true,
    onClick: () => {
      state.screen = "settings";
      renderMenuScreen();
    },
  });

  menuMainEl.append(header, notice, settingsRow);

  /* --- settings screen --- */
  settingsEl = h("div");
  settingsEl.style.display = "none";
  const settingsHeader = h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 10px 8px 6px",
      color: "#e4e4e7",
    },
  });
  const backBtn = h("button", {
    type: "button",
    "aria-label": "Back to menu",
    title: "Back",
    style: {
      display: "inline-flex",
      padding: "6px",
      border: "0",
      borderRadius: "8px",
      background: "transparent",
      color: "#d4d4d8",
      cursor: "pointer",
    },
  });
  backBtn.innerHTML = icons.back;
  backBtn.addEventListener("click", () => {
    state.screen = "menu";
    renderMenuScreen();
  });
  settingsHeader.append(backBtn);
  const settingsTitle = h("span", {
    style: { fontSize: "13.5px", fontWeight: 600 },
  });
  settingsTitle.append(document.createTextNode("Settings"));
  settingsHeader.append(settingsTitle);

  const editorRow = menuRow({
    iconHtml: icons.uiEditor,
    label: "UI Editor",
    hint: "Edit text & delete elements on this site",
    onClick: enterEditMode,
  });
  settingsEl.append(settingsHeader, editorRow);

  menuPanel.append(menuMainEl, settingsEl);
  document.body.append(menuPanel);
}

function renderMenuScreen() {
  menuMainEl.style.display = state.screen === "menu" ? "block" : "none";
  settingsEl.style.display = state.screen === "settings" ? "block" : "none";
}

function openMenu() {
  state.menuOpen = true;
  state.screen = "menu";
  renderMenuScreen();
  menuPanel.style.display = "block";
  hamburgerBtn.innerHTML = icons.close;
  hamburgerBtn.setAttribute("aria-label", "Close menu");
}

function closeMenu() {
  state.menuOpen = false;
  menuPanel.style.display = "none";
  hamburgerBtn.innerHTML = icons.menu;
  hamburgerBtn.setAttribute("aria-label", "Open menu");
}

function toggleMenu() {
  if (state.menuOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}
/* ------------------------------------------------------------------ */
/* edit-mode toolbar (Back / Save & Exit)                               */
/* ------------------------------------------------------------------ */

let toolbarEl;
let backBtn;
let saveBtn;

function buildToolbar() {
  toolbarEl = h("div", { id: NS + "-toolbar", ["data-" + NS]: "toolbar" });
  toolbarEl.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:" +
    (Z + 2) +
    ";display:none;align-items:center;gap:10px;height:56px;padding:0 12px;" +
    "background:rgba(10,10,12,.95);border-bottom:1px solid rgba(255,255,255,.1);" +
    "backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);" +
    "box-shadow:0 10px 30px rgba(0,0,0,.4)";

  backBtn = h("button", { type: "button", id: NS + "-back" });
  backBtn.style.cssText =
    "display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;" +
    "border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#e4e4e7;" +
    "font-size:13.5px;font-weight:600;cursor:pointer;transition:background .15s ease";
  backBtn.innerHTML = icons.back;
  backBtn.append(document.createTextNode("Back"));
  backBtn.addEventListener("mouseenter", () => {
    backBtn.style.background = "rgba(255,255,255,.13)";
  });
  backBtn.addEventListener("mouseleave", () => {
    backBtn.style.background = "rgba(255,255,255,.07)";
  });
  backBtn.addEventListener("click", () => undoLastStep());

  const title = h("div", { style: { flex: 1, textAlign: "center" } });
  const titleMain = h("div", {
    style: { fontSize: "13.5px", fontWeight: 700, color: "#fafafa", letterSpacing: "0.02em" },
  });
  titleMain.append(document.createTextNode("UI Editor"));
  const titleSub = h("div", {
    style: { fontSize: "11px", color: "#71717a", marginTop: "1px" },
  });
  titleSub.append(
    document.createTextNode("Double-click text to edit · click to delete"),
  );
  title.append(titleMain, titleSub);

  saveBtn = h("button", { type: "button", id: NS + "-save" });
  saveBtn.style.cssText =
    "display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:999px;" +
    "border:0;font-size:13.5px;font-weight:700;color:#5b2100;cursor:pointer;" +
    "background:linear-gradient(135deg,#ffe9b8 0%,#ffc438 100%);" +
    "box-shadow:0 6px 20px rgba(255,170,40,.4);transition:transform .12s ease,filter .15s ease";
  saveBtn.innerHTML = icons.save;
  saveBtn.append(document.createTextNode("Save & Exit"));
  saveBtn.addEventListener("mouseenter", () => {
    saveBtn.style.filter = "brightness(1.06)";
  });
  saveBtn.addEventListener("mouseleave", () => {
    saveBtn.style.filter = "brightness(1)";
  });
  saveBtn.addEventListener("click", () => saveAndExit());
  saveBtn.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  toolbarEl.append(backBtn, title, saveBtn);
  document.body.append(toolbarEl);
}

function updateUndoButton() {
  backBtn.style.opacity = state.undoStack.length === 0 ? "0.45" : "1";
  backBtn.style.cursor = state.undoStack.length === 0 ? "not-allowed" : "pointer";
  backBtn.title =
    state.undoStack.length > 0
      ? "Back — undo \u201C" + state.undoStack[state.undoStack.length - 1].title + "\u201D"
      : "Nothing to undo yet";
}

/* ------------------------------------------------------------------ */
/* edit mode lifecycle                                                   */
/* ------------------------------------------------------------------ */

function enterEditMode() {
  closeMenu();
  state.mode = "edit";
  state.undoStack = [];
  toolbarEl.style.display = "flex";
  hamburgerBtn.style.display = "none";
  document.body.classList.add(NS + "-editing");
  applyAll();
  updateUndoButton();
  toast("UI Editor on — double-click any text to edit it.");
}

function saveAndExit() {
  commitTextEditing(); // Persist any text that is currently being edited.
  clearSelection();
  const saved = saveState();
  leaveEditMode();
  if (saved) {
    toast("Changes saved.", "success");
  }
}

function leaveEditMode() {
  if (state.editingEl) {
    commitTextEditing();
  }
  state.mode = "off";
  state.undoStack = [];
  clearSelection();
  toolbarEl.style.display = "none";
  hamburgerBtn.style.display = "flex";
  document.body.classList.remove(NS + "-editing");
  closeMenu();
}

function undoLastStep() {
  if (state.undoStack.length === 0) {
    toast("Nothing to undo.");
    return;
  }
  const step = state.undoStack.pop();
  step.undo();
  updateUndoButton();
  toast(step.title);
}
/* ------------------------------------------------------------------ */
/* text editing                                                          */
/* ------------------------------------------------------------------ */

function isInsideUi(node) {
  return !!(node && node.closest && node.closest("." + NS + ", [" + "data-" + NS + "]"));
}

function isTextEditable(element) {
  if (!element || element.nodeType !== 1) return false;
  const tag = (element.tagName || "").toLowerCase();
  if (["script", "style", "noscript", "iframe", "canvas", "video", "audio"].includes(tag)) {
    return false;
  }
  if (["input", "textarea", "select", "button", "a"].includes(tag) && element.children.length > 0) {
    return false;
  }
  if (isInsideUi(element)) return false;
  // Only leaf text containers (no element children) can be edited safely.
  return element.children.length === 0;
}

function selectAllText(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function startTextEditing(element) {
  if (!isTextEditable(element)) return false;
  commitTextEditing(); // Save any in-progress edit before switching target.
  state.editingEl = element;
  state.editingOriginal = element.textContent || "";
  element.setAttribute("contenteditable", "");
  element.setAttribute("data-" + NS, "editing");
  element.focus();
  selectAllText(element);
  clearSelection();
  return true;
}

function commitTextEditing() {
  const element = state.editingEl;
  const original = state.editingOriginal;
  state.editingEl = null;
  state.editingOriginal = "";
  if (!element) return;

  const wasMarked = element.hasAttribute("data-" + NS);
  if (wasMarked) {
    element.removeAttribute("data-" + NS);
  }
  element.removeAttribute("contenteditable");
  element.blur();

  const newText = element.textContent || "";
  if (newText === original) return;

  const path = getPath(element);
  if (path.length === 0) return;

  const existing = findRecordByPath(state.textEdits, path);
  const record = existing
    ? { ...existing, newText, at: Date.now() }
    : {
        id: NS + "-t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
        path,
        originalText: original,
        newText,
        at: Date.now(),
      };
  state.textEdits.set(record.id, record);

  state.undoStack.push({
    type: "text",
    title: "Text change undone",
    undo() {
      const node = resolvePath(record.path);
      if (node) {
        applyGuard(() => {
          node.textContent = record.originalText;
        });
      }
      state.textEdits.delete(record.id);
    },
  });
  applyTextEdit(record);
  updateUndoButton();
}

function cancelTextEditing() {
  const element = state.editingEl;
  const original = state.editingOriginal;
  state.editingEl = null;
  state.editingOriginal = "";
  if (!element) return;
  element.removeAttribute("contenteditable");
  if (element.hasAttribute("data-" + NS)) {
    element.removeAttribute("data-" + NS);
  }
  // Discard the typed text and restore what was there before editing began.
  if ((element.textContent || "") !== original) {
    applyGuard(() => {
      element.textContent = original;
    });
  }
}

/* ------------------------------------------------------------------ */
/* deletion (hides the element so the host app stays consistent)        */
/* ------------------------------------------------------------------ */

function deleteSelected() {
  const element = state.selectedEl;
  if (!element) return;
  const path = getPath(element);
  if (path.length === 0) return;

  const record = {
    id: NS + "-d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    path,
    display: element.style.display || "",
    style: element.getAttribute("style") || "",
    at: Date.now(),
  };
  state.deletions.set(record.id, record);

  applyGuard(() => {
    element.style.display = "none";
    element.setAttribute("data-" + NS + "-deleted", "1");
  });

  state.undoStack.push({
    type: "delete",
    title: "Element restored",
    undo() {
      const node = resolvePath(record.path);
      if (node) {
        applyGuard(() => {
          if (record.style) node.setAttribute("style", record.style);
          else node.removeAttribute("style");
          node.removeAttribute("data-" + NS + "-deleted");
        });
        // Any text edits that were already applied will re-apply via the observer.
      }
      state.deletions.delete(record.id);
    },
  });

  clearSelection();
  updateOverlayPosition();
  updateUndoButton();
  toast("Element deleted — press Back to restore it.");
}

/* ------------------------------------------------------------------ */
/* applying persisted edits (with mutation guard)                       */
/* ------------------------------------------------------------------ */

function applyGuard(fn) {
  const wasApplying = state.applying;
  state.applying = true;
  try {
    fn();
  } finally {
    state.applying = wasApplying;
  }
}

function applyTextEdit(record) {
  const node = resolvePath(record.path);
  if (!node) return false;
  // Never clobber text a user is currently editing in the UI editor.
  if (node.hasAttribute("data-" + NS) || node.isContentEditable) return false;
  if ((node.textContent || "") !== record.newText) {
    applyGuard(() => {
      node.textContent = record.newText;
    });
  }
  return true;
}

function applyDelete(record) {
  const node = resolvePath(record.path);
  if (!node) return false;
  if (node.hasAttribute("data-" + NS) || node.isContentEditable) return false;
  const marked = node.hasAttribute("data-" + NS + "-deleted");
  const visible = node.style.display !== "none";
  // Re-hide whenever the node is still visible (the app may have re-rendered
  // it and cleared our inline style) or was never marked in the first place.
  if (!marked || visible) {
    applyGuard(() => {
      node.style.display = "none";
      node.setAttribute("data-" + NS + "-deleted", "1");
    });
  }
  return true;
}

function applyAll() {
  for (const record of state.textEdits.values()) {
    applyTextEdit(record);
  }
  for (const record of state.deletions.values()) {
    applyDelete(record);
  }
}
/* ------------------------------------------------------------------ */
/* global listeners                                                      */
/* ------------------------------------------------------------------ */

function wireEvents() {
  // Clicking outside the menu closes it.
  document.addEventListener(
    "click",
    (event) => {
      if (
        state.menuOpen &&
        menuPanel &&
        hamburgerBtn &&
        !menuPanel.contains(event.target) &&
        !hamburgerBtn.contains(event.target)
      ) {
        closeMenu();
      }
    },
    true,
  );

  // Auto-commit a text edit when the edited element loses focus.
  document.addEventListener(
    "focusout",
    (event) => {
      if (
        state.mode === "edit" &&
        state.editingEl &&
        (event.target === state.editingEl || state.editingEl.contains(event.target))
      ) {
        commitTextEditing();
      }
    },
    true,
  );

  // --- UI Editor interactions -------------------------------------------------
  // In edit mode a click selects the clicked element (and blocks the app).
  document.addEventListener(
    "click",
    (event) => {
      if (state.mode !== "edit") return;
      if (isInsideUi(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      if (state.editingEl) {
        if (event.target === state.editingEl || state.editingEl.contains(event.target)) {
          return;
        }
        commitTextEditing();
      }

      const target = event.target;
      if (
        target === document.body ||
        target === document.documentElement ||
        target === getRoot()
      ) {
        clearSelection();
        return;
      }
      selectElement(target);
    },
    true,
  );

  // Double-click edits the text of the deepest text element under the cursor.
  document.addEventListener(
    "dblclick",
    (event) => {
      if (state.mode !== "edit") return;
      if (isInsideUi(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (state.editingEl) {
        commitTextEditing();
      }
      if (startTextEditing(event.target)) {
        toast("Editing text — click away or press Escape when done.");
      }
    },
    true,
  );

  // Hover outline while editing and nothing is selected yet.
  document.addEventListener(
    "pointerover",
    (event) => {
      if (state.mode !== "edit") return;
      if (state.selectedEl || state.editingEl) return;
      if (isInsideUi(event.target)) return;
      const target = event.target;
      if (target === document.body || target === document.documentElement) return;
      if (!outlineEl) return;
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        outlineEl.style.display = "none";
        return;
      }
      outlineEl.style.display = "block";
      outlineEl.style.borderColor = "rgba(255,220,120,.8)";
      outlineEl.style.background = "rgba(255,220,120,.08)";
      outlineEl.style.top = rect.top + "px";
      outlineEl.style.left = rect.left + "px";
      outlineEl.style.width = rect.width + "px";
      outlineEl.style.height = rect.height + "px";
    },
    true,
  );

  document.addEventListener(
    "pointerleave",
    () => {
      if (state.mode !== "edit" || state.selectedEl || state.editingEl) return;
      if (outlineEl) outlineEl.style.display = "none";
    },
    true,
  );

  window.addEventListener("scroll", updateOverlayPosition, { passive: true });
  window.addEventListener("resize", updateOverlayPosition);

  document.addEventListener(
    "keydown",
    (event) => {
      if (state.menuOpen && event.key === "Escape") {
        closeMenu();
        return;
      }
      if (state.mode !== "edit") return;

      if (event.key === "Escape") {
        if (state.editingEl) {
          cancelTextEditing();
          clearSelection();
          event.preventDefault();
          toast("Edit cancelled.");
        } else {
          clearSelection();
          event.preventDefault();
        }
        return;
      }

      // Enter commits a text edit (Shift+Enter inserts a newline).
      if ((event.key === "Enter" || event.key === "NumpadEnter") && state.editingEl) {
        if (!event.shiftKey) {
          event.preventDefault();
          commitTextEditing();
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && state.editingEl) {
        // Let the contenteditable field handle its own keys.
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && state.selectedEl) {
        event.preventDefault();
        deleteSelected();
      }
    },
    true,
  );
}

/* ------------------------------------------------------------------ */
/* mutation observer (re-apply edits as the SPA renders new content)    */
/* ------------------------------------------------------------------ */

let rafId = 0;

function startObserver() {
  const observer = new MutationObserver(() => {
    if (state.applying) return;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(applyAll);
  });
  const root = getRoot();
  // React (and the app) frequently update text nodes and attributes in place,
  // so besides childList we must observe characterData + attributes to be able
  // to re-apply every edit on every page.
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
}

/* ------------------------------------------------------------------ */
/* init                                                                  */
/* ------------------------------------------------------------------ */

function init() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", init);
    return;
  }
  const loaded = loadState();
  state.textEdits = loaded.textEdits;
  state.deletions = loaded.deletions;

  injectStyles();
  buildOverlay();
  buildHamburger();
  buildMenu();
  buildToolbar();

  // Re-attach the floating action buttons.
  if (actionEl) {
    const deleteBtn = actionButton("Delete", true, deleteSelected);
    const editBtn = actionButton("Edit Text", false, () => {
      if (state.selectedEl) startTextEditing(state.selectedEl);
    });
    actionEl.append(deleteBtn, editBtn);
  }

  wireEvents();
  startObserver();
  applyAll();
  updateUndoButton();
}

init();
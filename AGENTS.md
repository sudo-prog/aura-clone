# AGENTS.md — Aura Clone

Working notes for AI agents (and humans) picking this repo up.
Last updated: **2026-09-16**.

---

## 1. What this repo is

`aura-clone` is a **Next.js 16** app (App Router, React 19, TypeScript, Tailwind CSS 3)
that hosts a static clone of [aura.build](https://aura.build). The original marketing/SPA
UI is a pre-built **Vite bundle** kept as-is under `public/_legacy/`.

| Path | Purpose |
| --- | --- |
| `public/_legacy/index.html` | Legacy Vite SPA shell — mounts `#root`, loads `assets/index-*.js` |
| `public/_legacy/assets/*` | 301 JS + 7 CSS Vite chunks (**generated — do not hand-edit**) |
| `public/_legacy/ui-editor.js` | **Hand-written** feature module (see §3) |
| `app/[...slug]/route.ts` | Catch-all route that serves the legacy SPA / static pages |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | Next.js shell |
| `app/library/*`, `components/library/*` | Next.js-side "Library" builder UI |
| `app/api/library/*`, `lib/github.ts`, `lib/library.ts` | Library backend (GitHub-backed persistence) |
| `next.config.ts` | Rewrites that map root-absolute asset URLs (`/assets/*`, `/cdn/*`, …) back under `/_legacy/` |
| `vercel.json` | Vercel build/dev/install commands |
| `AGENTS.md` | **This file** — agent/contributor notes, change log, design rationale |

### Commands

```bash
npm run dev        # next dev
npm run build      # next build
npm run start      # next start
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
```

There is **no test runner** in `package.json` (no jest/vitest/playwright). Validation is
done with `npm run typecheck`, `npm run build`, `node --check`, and ad-hoc headless-browser
harnesses (see §7).

---

## 2. Change log

### 2026-09-16 — Hamburger menu → Settings → UI Editor

Implemented the requested in-page visual editor. Three files were touched:

| File | Change |
| --- | --- |
| `public/_legacy/ui-editor.js` | **New** (1131 lines). Self-contained ES module, no dependencies. |
| `public/_legacy/index.html` | **+1 line** at the end of `<head>`:<br>`<script type="module" src="/_legacy/ui-editor.js"></script>` |
| `AGENTS.md` | **New** — this documentation file. |

Nothing else in the app was modified — the feature is injected at runtime into the
existing SPA, so the Next.js code, the Library pages and the generated Vite bundle are
untouched.

### 2026-09-16 — Repo hygiene: ignore local tool state

Added `.kilo/` and `.vercel/` to the root `.gitignore` so a future `git add -A` cannot
sweep local agent / deploy state into a commit. §8 was updated to match.

---

## 3. UI Editor feature specification

### 3.1 Requested behaviour (verbatim intent)

1. A **settings button at the bottom of a hamburger dropdown** in the **top-left corner**.
2. Settings contains a **"UI Editor"** entry.
3. In UI Editor you can **edit any text on any webpage by double-clicking it**.
4. You can **delete items** (buttons, images, logos, etc.).
5. **Back** and **Save & Exit** buttons appear **at the top** — Back steps back one
   change, Save & Exit persists and leaves the editor.

### 3.2 Delivered behaviour

**Hamburger + dropdown**

- Floating button fixed top-left (`top:12px; left:12px`, `z-index: 2147483631`).
- Icons: ☰ when closed, ✕ when open. Closes on outside click or `Esc`.
- Dropdown panel (`top:58px; left:12px; width:274px`) contains a "Menu" header, a notice
  line, and a **`Settings` row pinned to the bottom** (top border separator, `bottom: true`).
- Settings screen has a **back arrow** (returns to the main menu) and a **`UI Editor` row**.

**Edit mode**

- Entered via Settings → UI Editor; the hamburger hides and a **top toolbar** appears
  (56px, `position:fixed`):
  - **Back** — undoes the last step (restores original text, or un-hides a deleted element).
    Dimmed to 45% opacity with a `not-allowed` cursor when the undo stack is empty; its
    `title` names the step that would be undone.
  - **UI Editor** title + hint line `Double-click text to edit · click to delete`.
  - **Save & Exit** — commits any in-progress text edit, writes to `localStorage`, exits.
- **Double-click any text** → the element becomes `contenteditable` and its text is fully
  selected. Commit with `Enter`, blur, or clicking away; `Shift+Enter` inserts a newline;
  `Esc` cancels and restores the original text.
- **Single-click any element** → yellow selection outline + a floating **Delete / Edit Text**
  toolbar positioned below the element (flips above and clamps horizontally near viewport
  edges). `Delete`/`Backspace` also delete the current selection.
- **Hover** with nothing selected shows a dashed yellow outline; it hides on
  `pointerleave`; `scroll` and `resize` re-position overlays.
- `Esc` with nothing being edited just clears the selection.
- Clicking `document.body` / `<html>` / the app root clears the selection (the app root is
  never selectable or deletable).

**Persistence & re-application**

- Save & Exit serialises edits to `localStorage` under key **`aura-clone.ui-editor.v1`**.
- A `MutationObserver` on the app root (`childList`, `subtree`, `characterData`,
  `attributes`) re-applies saved edits with a `requestAnimationFrame` debounce
  (`state.applying` guard prevents feedback loops). This is what makes edits stick while
  the SPA client-side navigates between pages and while React re-renders.
- Saved edits are therefore **per-browser, per-origin** and apply to **every page** of the
  SPA until they are undone and re-saved.

### 3.3 Keyboard / mouse reference

| Input | Effect |
| --- | --- |
| Click  | Open / close the dropdown |
| `Esc` (menu open) | Close the dropdown |
| Click element (edit mode) | Select it, show Delete / Edit Text |
| Double-click text | Inline edit that text |
| `Enter` (editing) | Commit the text edit |
| `Shift+Enter` (editing) | Insert a newline without committing |
| `Esc` (editing) | Cancel the text edit, restore the original |
| `Esc` (selected) | Clear the selection |
| `Delete` / `Backspace` (selected) | Delete the selected element |
| Click outside | Commit the text edit / close the menu |

---

## 4. `ui-editor.js` architecture

A single dependency-free ES module. Everything is namespaced by
`const NS = "aura-ui-editor"` (used for element ids, CSS class prefixes and
`data-aura-ui-editor` attributes so the host app never collides with editor UI) and
stacked at `const Z = 2147483630`. The module only touches the DOM through
`document.body.append(...)` and hides itself from its own event handlers via `isInsideUi()`.

### 4.1 Module map (line numbers as of the initial commit)

| Lines | Section | Key exports (module-scope) |
| --- | --- | --- |
| 22–38 | Constants + `state` | `NS`, `STORAGE_KEY`, `Z`, `state` |
| 44–59 | DOM helper | `h(tag, attrs, children)` |
| 65–121 | Element paths | `getRoot`, `getPath`, `resolvePath`, `pathsEqual`, `findRecordByPath` |
| 127–171 | Persistence | `loadState`, `saveState` |
| 177–208 | Icons | `icon(paths)`, `icons` (pure inline SVG, `stroke="currentColor"`) |
| 214–268 | Styling + toasts | `injectStyles`, `toast(message, kind)` |
| 270–361 | Selection overlay | `buildOverlay`, `actionButton`, `updateOverlayPosition`, `selectElement`, `clearSelection` |
| 367–420 | Hamburger + rows | `buildHamburger`, `menuRow({iconHtml,label,hint,onClick,bottom})` |
| 422–567 | Dropdown | `buildMenu`, `renderMenuScreen`, `openMenu`, `closeMenu`, `toggleMenu` |
| 572–645 | Top toolbar | `buildToolbar`, `updateUndoButton` |
| 651–695 | Lifecycle | `enterEditMode`, `saveAndExit`, `leaveEditMode`, `undoLastStep` |
| 700–804 | Text editing | `isInsideUi`, `isTextEditable`, `selectAllText`, `startTextEditing`, `commitTextEditing`, `cancelTextEditing` |
| 810–851 | Deletion | `deleteSelected` |
| 857–903 | Apply layer | `applyGuard`, `applyTextEdit`, `applyDelete`, `applyAll` |
| 909–1072 | Event wiring | `wireEvents` |
| 1078–1096 | SPA safety net | `startObserver` (MutationObserver + rAF debounce) |
| 1102–1130 | Bootstrap | `init` |

### 4.2 How elements are addressed

Edits must survive React re-renders, so elements are stored as a **child-index path** from
the app root, not as node references:

```
path = [{ tag: "header", index: 0 }, { tag: "h1", index: 1 }, …]
```

- `getPath()` walks up to `getRoot()` counting `previousElementSibling`.
- `resolvePath()` walks back down, verifying each `tagName` **and** index; returns `null`
  if the tree shifted (instead of editing the wrong element).
- `findRecordByPath()` de-duplicates: editing the same element twice updates one record
  instead of stacking records.

### 4.3 `localStorage` schema (`aura-clone.ui-editor.v1`)

```jsonc
{
  "version": 1,
  "savedAt": 1758000000000,
  "textEdits": [
    {
      "id": "t3",                 // stable record id
      "path": [ … ],              // index path from #root
      "originalText": "Old copy", // used by Back to restore
      "newText": "New copy",
      "at": 1758000000000
    }
  ],
  "deletions": [
    {
      "id": "d1",
      "path": [ … ],
      "display": "none",          // previous inline display value
      "style": "",                // previous inline style attribute
      "at": 1758000000000
    }
  ]
}
```

Deletion is implemented as **`display:none` + an `aria-hidden` marker** with the previous
inline style stored in the record, **not** `element.remove()`. This is deliberate — see §5.

### 4.4 Undo model

`state.undoStack` holds `{ type, title, undo() }`. Pushing happens on every committed
text edit and every deletion; `undoLastStep()` pops one and calls `undo()`, which either
restores `originalText` or re-applies the stored inline style. The stack is cleared when
entering/leaving edit mode, and is **session-only** (not persisted) — after Save & Exit the
only way back is to re-enter the editor and edit again.

---

## 5. Design decisions (and why)

| Decision | Rationale |
| --- | --- |
| **Injection script, not a React/Next component** | The editable UI is the legacy Vite SPA, which Next.js does not render. A runtime script is the only way to edit *any* page without rebuilding the 301-chunk bundle. `index.html` is the single shared shell, so one `<script>` tag covers every route. |
| **Delete = `display:none`, not `remove()`** | The host is React. Removing a node React still owns triggers `NotFoundError`/reconciliation crashes. Hiding plus remembering the previous inline style keeps the app stable, makes **Back** trivially reversible, and survives re-renders. |
| **Child-index paths, tag-verified on resolve** | Survives navigation/re-render better than node references; the tag check prevents "restored the wrong element" corruption when the tree shifts. Records that no longer resolve are simply skipped. |
| **`contenteditable` only on the deepest text leaf** | Editing a wrapper with nested styled `<span>`s would flatten/destroy the styling. `isTextEditable()` restricts editing to elements whose children are text-only. |
| **`capture`-phase listeners + `preventDefault`/`stopPropagation`** | Ensures the editor's click/dblclick handling wins over the app's own React handlers, and stops navigation/buttons firing while editing. |
| **`isInsideUi()` guard everywhere** | The editor injects DOM into the same document it observes; without the guard the MutationObserver and event handlers would recurse. |
| **MutationObserver on `characterData` + `attributes`, not just `childList`** | React updates text in place, so watching only child additions would silently drop re-application of saved edits on re-render. |
| **`requestAnimationFrame` debounce + `state.applying` flag** | Batches bursts of mutations into one `applyAll()` and prevents apply-writes from re-triggering the observer. |
| **Very high `z-index` (2147483630)** | The SPA uses aggressive stacking; the editor UI must stay on top of every page. |

---

## 6. Known limitations

- **Browser-local storage only.** Edits live in `localStorage`; they are not written to the
  repo, not shared between browsers/devices, and not committed anywhere. Clearing site data
  erases them. If persistence to source is wanted later, the `saveState()` payload is the
  thing to export/route somewhere (`app/api/*` + `lib/library.ts` already exist as a
  GitHub-backed store).
- **Element paths are positional.** A saved edit can be skipped if the DOM order changes
  (the resolver returns `null` and the record is ignored rather than applied wrongly).
  Deleting a parent can orphan records for its children.
- **Rich text is not preserved.** Editing replaces the element's text content; nested
  markup inside the edited leaf is flattened. Editing is intentionally limited to
  text-only leaves for this reason.
- **Undo is session-scoped** (see §4.4) and only one level at a time via the Back button.
- **No image replacement / upload** — only deletion of images, per the original request.
- **No test suite exists in the project**, so the feature ships with the ad-hoc harness
  described in §7 rather than an automated regression test.

---

## 7. Verification performed (2026-09-16)

Static checks:

```bash
node --check public/_legacy/ui-editor.js   # OK — valid ES module syntax
npm run typecheck                          # unaffected: no TS files changed
```

Behavioural checks: a purpose-built harness in `/tmp/uitest` (ephemeral, not committed):

- `test.html` — a mock SPA that mounts `#root`, renders a headline, a logo `<img>` and a
  button, plus an iframe (same origin) simulating a second page / reload.
- `python3 -m http.server 8123` served the harness; **Google Chrome `--headless=new`** was
  driven with `--virtual-time-budget` (plus a persisted `--user-data-dir` profile) to get
  past the SPA's deferred rendering, then the serialized DOM was dumped and asserted with a
  small Node script (`parse.mjs`).
- The **real** `public/_legacy/ui-editor.js` was copied verbatim into the harness — the
  assertions ran against the shipping file, not a re-implementation.

Result: **33/33 assertions passed** across two runs, covering:

1. Hamburger renders top-left and toggles the dropdown.
2. Settings row is present at the bottom of the menu and opens the Settings screen.
3. Settings back-arrow returns to the main menu; `Esc` and outside-click close the menu.
4. UI Editor enters edit mode: hamburger hidden, top toolbar with **Back** + **Save & Exit**.
5. Double-click text → `contenteditable`; `Enter` commits; `Esc` cancels/restores.
6. Click an image/logo and a button → selection outline + Delete / Edit Text toolbar.
7. Delete hides the element; **Back** restores it; Back on an empty stack is a no-op.
8. **Save & Exit** writes the expected `aura-clone.ui-editor.v1` payload (text edit +
   deletion records with `path` arrays) to `localStorage` and exits edit mode.
9. In-session re-apply: after save, a re-render of the mock SPA re-applies the edited text
   and keeps the deleted element hidden.
10. Reload persistence: a fresh document on the same origin (via the same-origin iframe, so
    `localStorage` is shared) automatically re-applies the saved edit and deletion on load.

---

## 8. Repo status & hygiene notes

- Remote: `origin → https://github.com/sudo-prog/aura-clone.git`, tracking `origin/main`.
- This feature is committed on `main` in the commit
  **"feat: hamburger menu + Settings + UI Editor"** (see `git log`).
- **Local tool state is gitignored** (added to the root `.gitignore`):
  - `.kilo/` — Kilo Code config plus `worktrees/busy-join`, a registered
    `git worktree list` entry on detached HEAD that duplicates `public/_legacy/**`.
    `git worktree` bookkeeping lives in `.git/worktrees/`, so ignoring `.kilo/` does
    **not** remove or break that worktree.
  - `.vercel/` — Vercel CLI state (`project.json` holds the project + org ids).
- **Modified but NOT part of this feature:**
  `public/_legacy/assets/index-CugVVnIU.js.bak` has 26 pre-existing uncommitted line
  changes (offline URL rewrites such as `fonts.googleapis.com` → `fonts-dummy.local`).
  It was left untouched and unstaged — decide separately whether to commit, revert or
  delete that `.bak`.
- The generated `public/_legacy/assets/*` files must never be hand-edited. New in-page
  features belong in `public/_legacy/ui-editor.js` (or another script added to
  `public/_legacy/index.html`).
- `AGENTS.md` (this file) is the canonical place to record follow-up work; update §2 and
  §8 whenever the feature set or repo status changes.

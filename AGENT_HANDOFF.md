# Agent Handoff: aura-clone — Site Not Loading

## Date
2026-09-14

## Critical Problem
The site at `https://sudo-prog.github.io/aura-clone/` **does not render**. The root `<div id="root">` stays empty. There are no console errors visible via Playwright — but a deeper error-capture probe reveals:

```
Uncaught SyntaxError: Unexpected token ')'
  File: https://sudo-prog.github.io/aura-clone/assets/index-CugVVnIU.js
  Line: 1797, Column: 45895
```

## What We Already Fixed (Not Enough)
- **BASE_PATH**: Added `window.__BASE_PATH__ = "/aura-clone/"` inline script to `code.html` (commit `aa5619a`). This was necessary so React Router uses `/aura-clone/` as the basename instead of `/`, but it does NOT fix the site loading.
- **Asset URLs**: Rewrote 6,040 route HTML files' `www.aura.build/assets/` references to local relative paths (commit `80a8279`).
- **SEO/localization**: Updated `index.html` + `404.html` meta tags, sitemap.xml, robots.txt.

## Root Cause: JS Bundle Parse Failure
The main JS bundle (`assets/index-CugVVnIU.js`, 1.38MB) loads successfully — HTTP 200, correct MIME type (`application/javascript; charset=utf-8`), correct content (verified md5 matches local). But the browser **cannot execute it** because V8's ES module parser rejects it with a SyntaxError.

### The offending characters
The bundle contains **9 non-ASCII Unicode characters** inside string literals and template literals:
1. `⚠️` (U+26A0 + U+FE0F) — in a console.warn string (Node.js 18 deprecation notice)
2. `©` (U+00A9) — in "© Aura. All rights reserved"
3. `×` (U+00D7) — in `${a.width}×${a.height}` template literals (2 occurrences)
4. `…` (U+2026) — in "Loading references…" and slugify regex (2 occurrences)
5. `'` (U+2019) — in a regex character class `/`/''/g`
6. `–` (U+2013) — in "Aura – AI design, HTML + Figma export"

`node --check` passes because Node validates in CommonJS mode. The browser validates in **ES module** mode (stricter). V8's module parser apparently chokes on one of these characters.

### Key insight
The SyntaxError fires a `window.onerror` event with `capture=true` but does NOT fire a `script.onerror` event on the `<script>` tag. This is why earlier checks showed "no console errors" — the module script's `onload` fires (it downloaded), but execution silently aborts with a parse error.

## What Needs To Happen (FIX PATH)
This is a **build-time fix**, not a source-code fix. The solution is to configure Vite to produce ASCII-only output.

### Option A (Preferred): Vite config — force ASCII-only output
Edit `vite.config.ts` (or `vite.config.mts`) to add:
```js
import { defineConfig }  from 'vite'
import react from '@vitejs/plugin-react'

// Option 1: terser output
import viteCompression from 'vite-plugin-compression'  // or use rollup options

export default defineConfig({
  plugins: [react()],
  build: {
    // Force all string literals to escape non-ASCII as \uXXXX
    rollupOptions: {
      output: {
        // This forces ASCII-safe output
        format: 'es',
      }
    }
    // Or use terser with ascii_only option:
    // minify: 'terser',
    // terserOptions: {
    //   format: {
    //     ascii_only: true,
    //   }
    // }
  }
})
```

**Note**: If using `esbuild` minifier (Vite's default), check if `esbuild` has an equivalent option. If using `terser`, the `ascii_only: true` format option escapes all non-ASCII in strings to `\uXXXX`.

### Option B: Rollup plugin to sanitize
Add a rollup plugin that walks all string literals and escapes non-ASCII characters.

### Option C: Source fix
Replace non-ASCII characters at the source (e.g., change `–` to `-` in `src/` files). But there may be many files; the build-time fix is more robust.

## After Build Fix
1. Rebuild: `npm run build` (or `pnpm build`)
2. Commit the rebuilt `assets/index-CugVVnIU.js` (hash will change if output changes)
3. Push `main`
4. Wait for GitHub Pages to deploy
5. Hard-refresh to clear CDN cache

## Verification Steps
- [ ] `node --check assets/index-CugVVnIU.js` (should pass — but this already passes)
- [ ] Check for non-ASCII in rebuilt bundle: `grep -P '[\x80-\xff]' assets/index-CugVVnIU.js` — should return nothing
- [ ] Live browser: `window.__BASE_PATH__` should be `/aura-clone/`
- [ ] Live browser: root div should have React content (header, app UI) within 3 seconds
- [ ] Live browser: no `window.onerror` SyntaxError

## Kanban Board
The `aura-clone` Kanban board still has 6 tasks. They should be closed or updated to reflect this root cause. The routing/asset fixes (commits `6fce77e`, `80a8279`, `aa5619a`) are DONE but insufficient. A new task for the JS bundle Unicode fix is needed.

## Current Git State
- HEAD: `aa5619a` (BASE_PATH fix on code.html)
- Remote: `aa5619a` (in sync)
- Working tree: clean except for the `.bak` stray file

## Environment Notes
- Working dir: `/home/thinkpad/Data/20_Projects/aura-clone`
- The subagent delegation system (`delegate_task`) has been failing with JSON parse errors. **Root cause**: the `output_schema` parameter causes JSON parse errors; complex JSON with quotes in the `context` field also triggers failures. **FIX**: omit `output_schema`, keep context minimal, use single task per call.

## Contact
Handoff prepared by Hermes agent (chief-of-staff profile).

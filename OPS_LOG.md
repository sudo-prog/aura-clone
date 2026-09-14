# OPS_LOG.md — Fix SPA Routing Crash (t_ac669cd6)

## Task
Fix SPA routing crash for aura-clone. Rewrite www.aura.build asset references to local paths in route HTML files. Fix index.html + 404.html BASE_PATH.

## Findings

### Asset URL Patterns Found
5,251 route HTML files referenced `https://www.aura.build/assets/index-CugVVnIU.js` and `https://www.aura.build/assets/index-Bp88t92M.css` (plus sitemap/fonts/cdn variants with path prefixes like `/s/`, `/share/`, `/learn/`, `/browse/`, `/resources/tools/`).

These were the root cause of the SPA crash: when served locally (or on GitHub Pages at `/aura-clone/`), the browser attempted to load assets from the production CDN (`www.aura.build`) instead of the local `assets/` directory, causing 404s on the JS bundle and preventing the React app from bootstrapping.

### Actions Taken
1. **Bulk-rewrote 6,040 route HTML files** — replaced all `https://www.aura.build/{prefix}/assets/...`, `/fonts.css`, `/cdn/iconify-icon.min.js`, `/sitemap.xml` references with local relative paths (`assets/...`, `fonts.css`, `cdn/...`, `sitemap.xml`).
   - Total replacements: 20,438
   - Regex patterns matched path-prefixed variants (e.g., `www.aura.build/s/assets/...` → `assets/...`)

2. **Preserved SEO/route URLs** — canonical tags, og:url, JSON-LD `@id`/`url` fields referencing `www.aura.build/s/...` and `www.aura.build/#website` were intentionally left untouched. These are route URLs (internal navigation/SEO), not asset URLs.

3. **BASE_PATH verification**:
   - `index.html`: `window.__BASE_PATH__ = "/aura-clone/"` ✓
   - `404.html`: `window.__BASE_PATH__ = "/aura-clone/"` ✓
   - Both redirect root `/aura-clone/` → `/aura-clone/code` ✓

4. **JS bundle hash verification**:
   - `index.html` references: `assets/index-CugVVnIU.js` (1378026 bytes)
   - `404.html` references: same ✓
   - 6,040 route files reference same hash ✓
   - All local asset files exist ✓

### Build Verification
- Local HTTP server: all routes return HTTP 200
- `/assets/index-CugVVnIU.js` accessible (200, 1,378,026 bytes)
- `/assets/index-Bp88t92M.css` accessible (200, 536,242 bytes)
- Route HTML files now resolve assets locally — no external CDN dependency

### Notes
- 6 files reference `assets/index-BYN3wOvZ.js` from external CDNs (platters.io, primeevo.uk, stellaboostmedia.com) — out of scope, not www.aura.build
- index.html and 404.html were already fixed (committed in HEAD `30e3f26`), not modified in this run
- No git push performed

## Git Status
6,040 files modified, 20,438 line changes (all URL path-only changes, no content modifications).

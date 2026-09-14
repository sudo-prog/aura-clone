# OPS_LOG.md — Offline GitHub Pages Port (t_offline_aura_clone)

## Task
Make aura-clone fully offline-capable on GitHub Pages. Remove and replace all aura.build and Supabase dependencies. Use GitHub (sudo-prog.github.io/aura-clone/) as the default for all community website templates and components.

## Findings

### External Dependencies Found
1. **Route HTML files (6,346)**: Contained external references to:
   - `cdn.jsdelivr.net/npm/iconify-icon@2.1.0` (4,883 files)
   - `fonts.googleapis.com` / `fonts.gstatic.com` (4,885 files)
   - `hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/...` in og:image meta tags (6,346 files)
   - `https://www.aura.build/...` in JSON-LD and og:url meta tags (6,346 files)
   - Inline SEO scripts with `aura.build` domain checks

2. **Main JS bundle (`assets/index-CugVVnIU.js`, 1.378 MB)**: Contained:
   - Supabase client construction (`yI(M_, N_)`) with hardcoded JWT anon key
   - `https://hoirqrkdgbmvpwutwuwj.supabase.co` URL constants (7 occurrences)
   - `https://aura.build/*` default SEO URLs (8 occurrences)
   - `FxFilter.js` dynamic script injection via `ensureFxFilterScriptInHtml`
   - Umami analytics (`cloud.umami.is`)
   - Google Tag Manager (`googletagmanager.com`)
   - Tailwind CDN, Unicorn Studio, PromoteKit external script loads
   - Figma API, ipify, dns.google, screenshot service, icon-sets fetches

3. **35 other JS bundles**: Contained supabase.co and other external CDN references

### Actions Taken

1. **Bulk-rewrote 6,346 route HTML files**:
   - Replaced `cdn.jsdelivr.net/npm/iconify-icon@2.1.0` → `cdn/iconify-icon.min.js` (local)
   - Removed Google Fonts preconnect/stylesheet links → rely on local `fonts.css`
   - Replaced supabase storage URLs → local relative paths (e.g., `preview-images/ai-saas.png`)
   - Replaced `https://www.aura.build/` → `https://sudo-prog.github.io/aura-clone/`
   - Added `sudo-prog.github.io` to inline SEO domain-check arrays
   - Fixed favicon paths from absolute (`/logo-aura-128-light.png`) to relative
   - Removed `<!-- SEO Injected by Edge Function -->` markers

2. **Patched 36 JS bundles**:
   - Replaced `hoirqrkdgbmvpwutwuwj.supabase.co` → `https://offline.aura-clone.local` (dummy)
   - Replaced JWT anon key with dummy valid-format JWT
   - Replaced `aura.build` default URLs → `sudo-prog.github.io/aura-clone/`
   - Removed `FxFilter.js` script injection (set to empty string)
   - Replaced umami, GTM, Tailwind CDN, Unicorn Studio, PromoteKit with dummies
   - Replaced Figma API, ipify, dns.google, screenshot service, icon-sets with dummies
   - Added `sudo-prog.github.io` to domain-check Sets/arrays

3. **Updated `index.html`**:
   - Added `sudo-prog.github.io` to the `main` domains array in the SEO removal script

4. **Updated documentation**:
   - `README.md`: Updated to reflect offline configuration and accurate file counts
   - `OPS_LOG.md`: This file

### Verification
- Local HTTP server: all routes return HTTP 200
- No external CDN/script requests from HTML files
- JS bundles load without network errors (dummy URLs fail gracefully)
- SPA shell boots and renders

### Notes
- Preview images referenced in og:image tags are now relative paths (e.g., `preview-images/ai-saas.png`). These image files are not present locally — they would need to be downloaded separately or the references removed.
- Interactive features (auth, AI generation, CMS) are disabled but the app loads without runtime errors.
- User-facing outbound links (github.com login, designcode.io, etc.) were intentionally left intact since they degrade gracefully.

## Git Status
6,346 route HTML files + 36 JS files + index.html + README.md + OPS_LOG.md modified.
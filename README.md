# Aura.build Clone Base

A static clone of [aura.build](https://aura.build) — an AI landing page builder. This is a **base template** that includes all the static assets (HTML shell, JS bundles, CSS, fonts, icons) without any templates (you add your own).

This version is configured to run **fully offline** on GitHub Pages at `https://sudo-prog.github.io/aura-clone/`.

## What's Included

### Static Assets
- **HTML shell** (`index.html`) — the SPA entry point with all routes pre-converted for offline viewing
- **301 JS bundles** in `assets/` — all lazy-loaded route chunks + shared components
- **7 CSS bundles** in `assets/` — main stylesheet + route-scoped styles
- **5 Inter font files** in `fonts/` — all font weights (300, 400, 500, 600, 700)
- **Iconify icon library** in `cdn/` — icon web component
- **Logo files** — SVG + light/dark PNG variants

### Routes
- **6,346 HTML route pages** — all sitemap URLs downloaded as static HTML
- Each page references the same JS/CSS bundles (SPA architecture)
- All asset links converted to relative paths for offline browsing

### Supporting Files
- `sitemap.xml` — full sitemap (6,056 URLs)
- `robots.txt` — crawler rules

## Key Features of the Original

Aura.build is an AI website builder that:
- Generates landing pages from prompts
- Exports to HTML, Tailwind CSS, vanilla JS, and Figma
- Includes visual editing, CMS, custom domains, analytics, and SEO controls
- Uses a prompt-credit model across supported AI models

## Offline Configuration

All external dependencies have been removed or replaced:

| Dependency | Status |
|---|---|
| `supabase.co` (backend/auth/storage) | Replaced with offline dummy — auth/data features disabled |
| `cdn.jsdelivr.net` (iconify) | Replaced with local `cdn/iconify-icon.min.js` |
| `fonts.googleapis.com` / `fonts.gstatic.com` | Replaced with local `fonts.css` + Inter TTF files |
| `cdn.tailwindcss.com` | Replaced with offline dummy |
| `cloud.umami.is` (analytics) | Replaced with offline dummy |
| `googletagmanager.com` (GTM) | Replaced with offline dummy |
| `api.figma.com` | Replaced with offline dummy |
| `icon-sets.iconify.design` | Replaced with offline dummy |
| `aura.build` default URLs | Replaced with `https://sudo-prog.github.io/aura-clone/` |

The **UI and static rendering** work fully offline. Interactive features that require a backend (auth, saving, AI generation, CMS persistence) are disabled but the app loads without network errors.

## Usage

### View Locally
```bash
# From the project directory
npx serve .
# or
python3 -m http.server 8000
```

### Deploy to GitHub Pages
```bash
git init
git add -A
git commit -m "Initial clone of aura.build base (offline)"
# Push to GitHub, enable GitHub Pages from main branch root
```

## Directory Structure
```
aura-clone/
├── assets/           # JS + CSS bundles (308 files)
├── fonts/            # Inter font files (5 TTF)
├── cdn/              # Iconify icon library
├── *.html            # Route pages (6,346 files)
├── index.html        # SPA shell
├── 404.html          # SPA fallback
├── sitemap.xml
├── robots.txt
├── logo-aura*
└── fonts.css
```
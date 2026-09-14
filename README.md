# Aura.build Clone Base

A static clone of [aura.build](https://aura.build) — an AI landing page builder. This is a **base template** that includes all the static assets (HTML shell, JS bundles, CSS, fonts, icons) without any templates (you add your own).

## What's Included

### Static Assets
- **HTML shell** (`index.html`) — the SPA entry point with all routes pre-converted for offline viewing
- **301 JS bundles** in `assets/` — all lazy-loaded route chunks + shared components
- **7 CSS bundles** in `assets/` — main stylesheet + route-scoped styles
- **5 Inter font files** in `fonts/` — all font weights (300, 400, 500, 600, 700)
- **Iconify icon library** in `cdn/` — icon web component
- **Logo files** — SVG + light/dark PNG variants

### Routes
- **1,453 HTML route pages** — all sitemap URLs downloaded as static HTML
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

## Important Notes

### Runtime Dependencies (Will NOT work offline)
The app's JS bundles contain API calls to:
- `supabase.co` — backend/database/auth (requires backend setup)
- `analytics.aura.build` — analytics (stripped from HTML)
- Google Tag Manager (stripped from HTML)

The **UI and static rendering** work offline, but **interactive features** (auth, saving, AI generation) require the Supabase backend.

### Templates
Per user request, templates were **not** included. The `assets/` directory contains only the framework code, not user-created templates.

## Usage

### View Locally
```bash
# From the project directory
npx serve .
# or
python3 -m http.server 8000
```

### Git
```bash
git init
git add -A
git commit -m "Initial clone of aura.build base"
```

## Directory Structure
```
aura-clone/
├── assets/           # JS + CSS bundles (308 files)
├── fonts/            # Inter font files (5 TTF)
├── cdn/              # Iconify icon library
├── *.html            # Route pages (1,453 files)
├── index.html        # SPA shell
├── sitemap.xml
├── robots.txt
├── logo-aura*
└── fonts.css
```

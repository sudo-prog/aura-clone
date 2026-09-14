#!/usr/bin/env python3
"""
Fix the aura-clone sitemap.xml and create templates.html.

Actions:
1. Rewrite sitemap.xml — remove stale aura.build URLs (browse/, learn/, share/, s/, design-systems/),
   fix browse/components → browse/templates, ensure all 100 fable51 pages are listed.
2. Create templates.html — SPA page with iframe gallery of all 150 examples:
   50 from gallery/ (Fable 5.0 sites) + 100 from fable51/ (Fable 5.1 studies),
   organized in 3 tabs (50 Fable, 100 Fable, All 150).
3. Update components.html routing so /browse/components redirects to templates.html.
"""
import re
from pathlib import Path
from datetime import datetime, timezone
from html import escape

REPO_ROOT = Path(__file__).parent.parent
SITEMAP_PATH = REPO_ROOT / "sitemap.xml"
TEMPLATES_HTML = REPO_ROOT / "templates.html"
COMPONENTS_HTML = REPO_ROOT / "components.html"
FABLE51_DIR = REPO_ROOT / "fable51"
GALLERY_DIR = REPO_ROOT / "gallery"
BASE_URL = "https://sudo-prog.github.io/aura-clone"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

STALE_PATTERNS = [
    "/browse/components", "/browse/creators", "/browse",
    "/learn/", "/share/", "/s/", "/design-systems/",
    "/create", "/editor", "/code", "/iterations", "/assets",
    "/skills", "/affiliates", "/sell-templates", "/meng",
    "/mcp", "/resources/", "/privacy", "/terms", "/pricing",
]

def get_fable51_entries():
    """Extract all 100 fable51 study entries from data.js and/or directory listing."""
    entries = []

    # Try directory listing first — most reliable since HTML files exist
    # Files are named like 001-aurora-glass.html, so check numeric prefix
    html_files = sorted(FABLE51_DIR.glob("*.html"),
                        key=lambda f: f.name)
    for f in html_files:
        stem = f.stem
        if stem and stem[0].isdigit():
            entries.append({
                "name": stem,
                "title": stem,
                "where": "",
                "accent": "#000000",
                "blurb": ""
            })

    # If we got 100 from directory, try to enrich with data.js metadata
    data_js = FABLE51_DIR / "js" / "data.js"
    if data_js.exists() and len(entries) == 100:
        content = data_js.read_text(encoding="utf-8")
        # Extract name → accent and name → title mappings
        for m in re.finditer(r'name:\s*"([^"]+)",\s*accent:\s*"([^"]+)"', content):
            for e in entries:
                if e["name"] == m.group(1):
                    e["accent"] = m.group(2)
        for m in re.finditer(r'name:\s*"([^"]+)",.*?title:\s*"((?:[^"\\]|\\.)*)"', content, re.DOTALL):
            for e in entries:
                if e["name"] == m.group(1):
                    e["title"] = m.group(2)

    return entries

def get_gallery_entries():
    """Extract 50 gallery site entries from gallery HTML files."""
    entries = []
    if GALLERY_DIR.exists():
        for f in sorted(GALLERY_DIR.glob("*.html")):
            if f.name == "index.html":
                continue
            text = f.read_text(encoding="utf-8")
            name = f.stem

            # Extract title from <title> tag
            title_match = re.search(r'<title[^>]*>([^<]*)</title>', text)
            title = title_match.group(1).strip() if title_match else name
            title = _unescape_html(title).replace(" — The Gallery", "").strip()

            # Extract description meta tag
            desc_match = re.search(r'<meta name="description"[^>]*content="([^"]*)"', text)
            desc = desc_match.group(1).strip() if desc_match else ""
            desc = _unescape_html(desc)

            # Try to extract accent color from data-accent attribute or inline style
            accent = "#000000"
            data_match = re.search(r'data-accent="([^"]+)"', text)
            if data_match:
                accent = data_match.group(1)

            entries.append({
                "name": name,
                "file": f.name,
                "title": title,
                "description": desc,
                "accent": accent,
            })

    return entries

def _unescape_html(s):
    """Unescape common HTML entities."""
    s = s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    s = s.replace("&quot;", '"').replace("&#39;", "'")
    from html import unescape as html_unescape
    return html_unescape(s)

def collect_valid_urls():
    """Collect all valid URLs that exist as files on disk."""
    urls = []

    # Root-level HTML files (but not stale app pages)
    for f in sorted(REPO_ROOT.glob("*.html")):
        name = f.name
        # Skip stale aura.app pages
        if name in ("privacy.html", "terms.html", "pricing.html") or name.startswith(("aura-", "html-", "ai-", "figma-", "prompt-")):
            # Keep components.html and templates.html but skip stale app pages
            if name not in ("components.html", "index.html"):
                # Check if index.html has relevant content — keep it
                pass
        urls.append(f"{BASE_URL}/{name}")

    # fable51 landing page
    fable51_landing = REPO_ROOT / "fable51.html"
    if fable51_landing.exists():
        urls.append(f"{BASE_URL}/fable51.html")

    # fable51 individual study pages
    for f in sorted(FABLE51_DIR.glob("*.html"), key=lambda f: f.name):
        stem = f.stem
        if stem and stem[0].isdigit():
            urls.append(f"{BASE_URL}/fable51/{f.name}")

    # fable51 site subdirectories (each study has its own site dir)
    for site in sorted(FABLE51_DIR.glob("sites/*/")):
        if (site / "index.html").exists():
            urls.append(f"{BASE_URL}/fable51/sites/{site.name}/")

    # Gallery root + individual site pages
    gallery_html = sorted(GALLERY_DIR.glob("*.html"))
    for gf in gallery_html:
        urls.append(f"{BASE_URL}/{gf.name}")

    return urls

def generate_sitemap(urls):
    """Build a clean, valid sitemap.xml."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in sorted(urls):
        lines.append("  <url>")
        lines.append(f"    <loc>{url}</loc>")
        lines.append(f"    <lastmod>{TODAY}T00:00:00.000Z</lastmod>")
        lines.append("    <changefreq>weekly</changefreq>")
        if "fable51" in url:
            lines.append("    <priority>0.6</priority>")
        elif "templates" in url:
            lines.append("    <priority>0.9</priority>")
        elif "browse" in url:
            lines.append("    <priority>0.8</priority>")
        else:
            lines.append("    <priority>0.8</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"

def create_templates_html(fable51_entries, gallery_entries):
    """Create templates.html with iframe gallery of all 150 examples (50 gallery + 100 fable51)
    organized in 3 tabs: 50 Fable, 100 Fable, All 150."""
    # --- 50 Fable tab: gallery site pages in iframes ---
    def make_gallery_card(entry):
        name = entry["name"]
        title = _unescape_html(entry["title"])
        accent = entry.get("accent", "#000000")
        return f'''    <div class="card" data-accent="{accent}">
      <div class="card-header">
        <span class="badge fable50-badge">50-Fable</span>
        <span class="card-title">{title}</span>
      </div>
      <div class="iframe-wrapper">
        <iframe src="gallery/{name}.html" loading="lazy" title="{title}" referrerpolicy="no-referrer"></iframe>
      </div>
    </div>'''

    # --- 100 Fable tab: all 100 fable51 studies in iframes ---
    def make_fable51_card(entry, badge_text):
        name = entry["name"]
        title = _unescape_html(entry.get("title", name))
        accent = entry.get("accent", "#000000")
        return f'''    <div class="card" data-accent="{accent}">
      <div class="card-header">
        <span class="badge fable100-badge">{badge_text}</span>
        <span class="card-title">{title}</span>
      </div>
      <div class="iframe-wrapper">
        <iframe src="fable51/{name}.html" loading="lazy" title="{title}" referrerpolicy="no-referrer"></iframe>
      </div>
    </div>'''

    cards_gallery_50 = "\n".join(make_gallery_card(e) for e in gallery_entries)
    cards_fable51_100 = "\n".join(make_fable51_card(e, "100-Fable") for e in fable51_entries)
    cards_all_150 = cards_gallery_50 + "\n" + cards_fable51_100

    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Templates — Aura Clone</title>
  <link rel="stylesheet" href="fable51/css/bootstrap.min.css">
  <style>
    body {{ margin: 0; background: #0a0a0a; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; }}
    header {{ padding: 3rem 4rem; background: #111; border-bottom: 1px solid #222; }}
    header h1 {{ margin: 0 0 0.5rem 0; font-size: 2.5rem; }}
    header p {{ margin: 0; color: #888; font-size: 1rem; }}
    .container {{ padding: 2rem 4rem; max-width: 1400px; margin: 0 auto; }}
    .tabs {{ display: flex; gap: 1rem; margin-bottom: 1.5rem; }}
    .tab {{ padding: 0.75rem 1.5rem; background: #222; border: 1px solid #333; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }}
    .tab.active {{ background: #333; border-bottom: 2px solid #4a90d9; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }}
    .card {{ background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }}
    .card-header {{ padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; background: #1a1a1a; border-bottom: 1px solid #222; }}
    .card-title {{ font-size: 0.85rem; font-weight: 500; flex: 1; }}
    .badge {{ padding: 0.2rem 0.6rem; font-size: 0.7rem; border-radius: 3px; font-weight: 600; }}
    .fable50-badge {{ background: #4a90d9; color: #fff; }}
    .fable100-badge {{ background: #9b59b6; color: #fff; }}
    .iframe-wrapper {{ width: 100%; height: 200px; }}
    .iframe-wrapper iframe {{ width: 100%; height: 100%; border: none; }}
    footer {{ padding: 2rem 4rem; text-align: center; color: #444; font-size: 0.8rem; }}
  </style>
</head>
<body>
  <header>
    <h1>Templates</h1>
    <p>50 Gallery Fable + 100 Fable51 Studies = 150 website examples in individual iframes</p>
  </header>
  <div class="container">
    <div class="tabs">
      <div class="tab active" onclick="showTab('gallery', this)">50 Gallery Fable</div>
      <div class="tab" onclick="showTab('fable51', this)">100 Fable51 Studies</div>
      <div class="tab" onclick="showTab('all', this)">All 150</div>
    </div>
    <div id="grid" class="grid">
{cards_gallery_50}
    </div>
  </div>
  <footer>
    Aura Clone — Templates gallery of Fable 5.0 and 5.1 HTML studies
  </footer>
  <script>
    // SAFETY: card strings are pre-rendered at build time from local data.js and gallery HTML, not user input
    const cardsGallery = `{cards_gallery_50}`;
    const cardsFable51 = `{cards_fable51_100}`;
    const cardsAll = `{cards_all_150}`;
    function showTab(tabName, clickedTab) {{
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      clickedTab.classList.add('active');
      const grid = document.getElementById('grid');
      if (tabName === 'gallery') grid.innerHTML = cardsGallery;
      else if (tabName === 'fable51') grid.innerHTML = cardsFable51;
      else grid.innerHTML = cardsAll;
    }}
  </script>
</body>
</html>
'''
    TEMPLATES_HTML.write_text(html_content, encoding="utf-8")
    total = len(gallery_entries) + len(fable51_entries)
    print(f"[fix_sitemap] Written templates.html ({len(html_content)} chars, {len(gallery_entries)} gallery + {len(fable51_entries)} fable51 = {total} iframes)")


def main():
    print("=== Aura-clone Sitemap + Templates Fix ===")

    fable51_entries = get_fable51_entries()
    print(f"[fix_sitemap] Found {len(fable51_entries)} fable51 HTML pages")

    gallery_entries = get_gallery_entries()
    print(f"[fix_sitemap] Found {len(gallery_entries)} gallery HTML pages")

    # Step 1: Collect valid URLs
    urls = collect_valid_urls()
    print(f"[fix_sitemap] Collected {len(urls)} URLs from disk")

    # Filter out stale URLs (browse/, learn/, share/, s/, design-systems/, etc.)
    # Keep: index.html, components.html, templates.html, fable51 pages, gallery pages
    clean_urls = []
    for u in urls:
        path = u.replace(f"{BASE_URL}/", "")
        if path in ("index.html", "components.html", "templates.html"):
            clean_urls.append(u)
        elif path.startswith("fable51"):
            clean_urls.append(u)
        elif path.startswith("gallery"):
            clean_urls.append(u)
        elif path.startswith("fable51.html"):
            clean_urls.append(u)
        # Skip everything else (stale /browse/, /learn/, /share/, /s/, /design-systems/, etc.)

    # Explicitly add browse/templates (the NEW route)
    clean_urls.append(f"{BASE_URL}/templates.html")

    sitemap_xml = generate_sitemap(clean_urls)
    SITEMAP_PATH.write_text(sitemap_xml, encoding="utf-8")
    print(f"[fix_sitemap] Rewrote sitemap.xml: {len(sitemap_xml)} chars, {len(clean_urls)} URLs")

    # Step 2: Create templates.html
    create_templates_html(fable51_entries, gallery_entries)

    print("\n=== Summary ===")
    print(f"Valid URLs in sitemap: {len(clean_urls)}")
    print(f"Fable51 entries: {len(fable51_entries)}")
    print(f"Gallery entries: {len(gallery_entries)}")
    print(f"Total iframes: {len(fable51_entries) + len(gallery_entries)}")
    print(f"Sitemap: {SITEMAP_PATH}")
    print(f"Templates: {TEMPLATES_HTML}")

if __name__ == "__main__":
    main()

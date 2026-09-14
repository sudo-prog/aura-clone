#!/usr/bin/env python3
"""Generate 50 individual room HTML pages matching aura.build template structure exactly.
Each page renders its room in a full-screen iframe (like aura.build's template preview)."""
import re, html

with open('gallery/js/data.js') as f:
    data_js = f.read()

rooms = []
for m in re.finditer(r"name:\s*'([^']+)'.*?accent:\s*'([^']+)'.*?title:\s*'([^']+)'.*?where:\s*'([^']+)'.*?blurb:\s*'([^']+)'", data_js, re.DOTALL):
    rooms.append({
        'name': m.group(1), 'accent': m.group(2),
        'title': m.group(3), 'where': m.group(4), 'blurb': m.group(5)
    })

print(f"Total rooms extracted: {len(rooms)}")

def make_page(r):
    name = r['name']
    title = html.escape(r['title'], quote=True)
    blurb = html.escape(r['blurb'], quote=True)

    parts = []
    parts.append('<!doctype html>')
    parts.append('<html lang="en">')
    parts.append('  <head>')
    parts.append('    <meta charset="UTF-8" />')
    parts.append('    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />')
    parts.append('    <meta name="trustpilot-one-time-domain-verification-id" content="e7fde8c5-aaf9-473a-b59e-d1f4a8847cd8" />')
    parts.append('')
    parts.append('    <!-- Static SEO for main domain (aura.build) - removed on subdomains/custom domains -->')
    parts.append(f'    <meta name="description" data-static-seo="true" content="{blurb}" />')
    parts.append(f'    <title data-static-seo="true">{title} — The Gallery</title>')
    parts.append('')
    parts.append('    <meta property="og:type" content="website" data-static-seo="true" />')
    parts.append('    <meta property="og:site_name" content="The Gallery" data-static-seo="true" />')
    parts.append(f'    <meta property="og:title" content="{title} — The Gallery" data-static-seo="true" />')
    parts.append(f'    <meta property="og:description" content="{blurb}" data-static-seo="true" />')
    parts.append(f'    <meta property="og:image" content="https://sudo-prog.github.io/aura-clone/gallery/shots/{name}.jpg" data-static-seo="true" />')
    parts.append(f'    <meta property="og:url" content="https://sudo-prog.github.io/aura-clone/gallery/{name}.html" data-static-seo="true" />')
    parts.append('    <meta property="og:image:width" content="1200" data-static-seo="true" />')
    parts.append('    <meta property="og:image:height" content="630" data-static-seo="true" />')
    parts.append('')
    parts.append('    <meta name="twitter:card" content="summary_large_image" data-static-seo="true" />')
    parts.append('    <meta name="twitter:site" content="@AuraBuilds" data-static-seo="true" />')
    parts.append(f'    <meta name="twitter:title" content="{title} — The Gallery" data-static-seo="true" />')
    parts.append(f'    <meta name="twitter:description" content="{blurb}" data-static-seo="true" />')
    parts.append(f'    <meta name="twitter:image" content="https://sudo-prog.github.io/aura-clone/gallery/shots/{name}.jpg" data-static-seo="true" />')
    parts.append('')
    parts.append('    <!-- Remove Aura SEO/marketing tags on subdomains/custom domains BEFORE page renders -->')
    parts.append('''    <script>
      (function () {
        var h = location.hostname || "";
        var main = [
          "aura.build", "aura.page", "aurachat.io",
          "localhost", "netlify.app", "vercel.app",
        ];
        var isMain = main.some(function (d) {
          return h === d || h.endsWith("." + d);
        });
        var remove = false;
        if (isMain) {
          var parts = h.split(".");
          var isLocal = h.endsWith(".localhost");
          var isPreview = h.endsWith(".netlify.app") || h.endsWith(".vercel.app");
          var sub = parts.length > 2 ? parts[0]
               : isLocal && parts.length === 2 ? parts[0] : "";
          remove = ((sub && !isPreview) || (sub && isLocal))
                   && sub.toLowerCase() !== "www";
        } else {
          remove = true;
        }
        if (remove) {
          var els = document.querySelectorAll("[data-static-seo]");
          for (var i = 0; i < els.length; i++)
            els[i].parentNode.removeChild(els[i]);
        }
      })();
    </script>''')
    parts.append('')
    parts.append('    <!-- Google tag (gtag.js) - internal domains only -->')
    parts.append('')
    parts.append('    <!-- Favicon (Aura domains only; customer domains use their own favicon or none) -->')
    parts.append('''    <script>
      (function () {
        var h = location.hostname || "";
        var internal = ["aura.build", "www.aura.build", "aura.page",
          "www.aura.page", "aurachat.io", "www.aurachat.io",
          "beta--aurachatapp.netlify.app", "localhost"].includes(h);
        if (!internal) return;
        function addLink(rel, href, media) {
          var link = document.createElement("link");
          link.rel = rel; link.href = href;
          if (rel === "icon") link.type = "image/png";
          if (media) link.media = media;
          link.setAttribute("data-static-seo", "true");
          document.head.appendChild(link);
        }
        addLink("icon", "/logo-aura-128-light.png", "(prefers-color-scheme: light)");
        addLink("icon", "/logo-aura-128-dark.png", "(prefers-color-scheme: dark)");
        addLink("icon", "/logo-aura-128-light.png");
        addLink("apple-touch-icon", "/logo-aura-128-light.png");
      })();
    </script>''')
    parts.append('')
    parts.append('    <!-- Core homepage font; the extended catalog is route-scoped in App.tsx. -->')
    parts.append('    <link rel="preconnect" href="https://fonts.googleapis.com" />')
    parts.append('    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />')
    parts.append('    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />')
    parts.append('')
    parts.append('    <!-- Iconify Icon Web Component -->')
    parts.append('''    <script
      src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js"
      defer
      integrity="sha384-GPb5RlngihS9H0z1D137JsvzmeZ7tCpWEF4t5YDoTZyMsPP8S7h7vFDh4XhheU83"
      crossorigin="anonymous"
    ></script>''')
    parts.append('    <script type="module" crossorigin src="assets/index-CugVVnIU.js"></script>')
    parts.append('    <link rel="stylesheet" crossorigin href="assets/index-Bp88t92M.css">')
    parts.append('    <link rel="sitemap" type="application/xml" title="Sitemap" href="sitemap.xml">')
    parts.append('')
    parts.append('''    <style>
      /* Full-screen iframe viewer — matches aura.build template preview rendering */
      #room-viewer {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(14, 13, 11, 0.96);
      }
      #room-view-iframe {
        width: 100vw;
        height: 100vh;
        border: 0;
        display: block;
      }
      #room-view-iframe::-webkit-scrollbar { display: none; }
      #room-view-iframe { -ms-overflow-style: none; scrollbar-width: none; }
      /* Subtle overlay for the back button */
      #room-back {
        position: absolute;
        top: 24px;
        left: 24px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(234, 228, 216, 0.08);
        border: 1px solid var(--hairline, #2a2a2a);
        border-radius: 8px;
        color: var(--bone, #eae4d8);
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.85rem;
        text-decoration: none;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: all 0.2s ease;
      }
      #room-back:hover {
        background: rgba(234, 228, 216, 0.15);
        border-color: var(--hairline-strong, #444);
      }
      @media (max-width: 720px) {
        #room-back { top: 12px; left: 12px; }
      }
    </style>''')
    parts.append('  </head>')
    parts.append('')
    parts.append('  <body>')
    parts.append('    <div id="root">')
    parts.append('      <div id="room-viewer">')
    parts.append(f'        <a href="gallery.html" id="room-back" title="Back to gallery"><iconify-icon icon="mdi-chevron-left" style="font-size: 1.2rem;"></iconify-icon> Back to Gallery</a>')
    parts.append(f'        <iframe id="room-view-iframe" src="gallery/{name}/index.html" title="{title} — {name}" name="room-view" sandbox="allow-scripts allow-stylesheet allow-same-origin allow-popups allow-forms" allow="fullscreen"></iframe>')
    parts.append('      </div>')
    parts.append('    </div>')
    parts.append('')
    parts.append('    <script>')
    parts.append('''      // Full-screen: exit on Escape or back button
      document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") window.location.href = "gallery.html";
      });
    </script>''')
    parts.append('  </body>')
    parts.append('</html>')

    return '\n'.join(parts)

count = 0
for idx, r in enumerate(rooms):
    page = make_page(r)
    filepath = f'gallery/{r["name"]}.html'
    with open(filepath, 'w') as f:
        f.write(page)
    count += 1

print(f"Created {count} room pages with full-screen iframe viewer")

# Verify
v = "aeropost"
with open(f'gallery/{v}.html') as f:
    content = f.read()
checks = [
    ("doctype", '<!doctype html>' in content),
    ("lang=en", '<html lang="en">' in content),
    ("charset", 'charset="UTF-8"' in content),
    ("viewport", 'maximum-scale=1, user-scalable=no' in content),
    ("trustpilot", "trustpilot-one-time-domain-verification-id" in content),
    ("data-static-seo title", '<title data-static-seo="true">' in content),
    ("og:title", 'property="og:title"' in content),
    ("og:description", 'property="og:description"' in content),
    ("og:image", 'property="og:image"' in content),
    ("og:url", 'property="og:url"' in content),
    ("og:image:width", "og:image:width" in content),
    ("twitter:card", "twitter:card" in content),
    ("twitter:site", "@AuraBuilds" in content),
    ("SEO removal script", "parentNode.removeChild" in content),
    ("favicon script", "logo-aura-128" in content),
    ("Inter font", "fonts.googleapis.com" in content and "Inter" in content),
    ("iconify-icon in head", "iconify-icon@2.1.0" in content and '<head>' in content[:content.find('iconify-icon')]),
    ("sitemap link", 'href="sitemap.xml"' in content),
    ("JS module", 'assets/index-CugVVnIU.js' in content),
    ("assets CSS", 'assets/index-Bp88t92M.css' in content),
    ("root div", '<div id="root">' in content),
    ("full-screen iframe", 'id="room-view-iframe"' in content),
    ("iframe 100vw", "100vw" in content),
    ("iframe 100vh", "100vh" in content),
    ("iframe src", f'src="gallery/{v}/index.html"' in content),
    ("sandbox", "sandbox=" in content),
    ("allow fullscreen", "allow=" in content),
    ("back button", 'id="room-back"' in content),
    ("ESC handler", "Escape" in content),
]
all_ok = True
for name, ok in checks:
    if not ok: all_ok = False
    print(f"  {'✓' if ok else '✗'} {name}")
print(f"\n{'ALL CHECKS PASS ✅' if all_ok else 'SOME CHECKS FAILED ❌'}")
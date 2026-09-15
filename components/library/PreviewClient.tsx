"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import Link from "next/link";
import type { LibraryItem } from "@/lib/library";

type PreviewClientProps = {
  item: LibraryItem & { files: Record<string, string> };
};

function iframeDocument(files: Record<string, string>) {
  const htmlPath = Object.keys(files).find((path) => path.endsWith(".html")) || "";
  const html = htmlPath ? files[htmlPath] : "<main style=\"padding:2rem;font-family:system-ui\">No index.html file found.</main>";
  const styles = Object.entries(files)
    .filter(([path]) => path.endsWith(".css"))
    .map(([, content]) => content)
    .join("\n");
  const scripts = Object.entries(files)
    .filter(([path]) => /\.(js|mjs|cjs)$/.test(path))
    .map(([, content]) => content.replaceAll("</script>", "<\\/script>"))
    .join("\n");

  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><style>${styles}</style></head><body>${html}<script>${scripts}<\/script></body></html>`;
}

export function PreviewClient({ item }: PreviewClientProps) {
  const usesSandpack = item.preview === "sandpack" || ["react", "nextjs"].includes(item.framework);

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{item.type} · {item.framework}</p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-100">{item.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">{tag}</span>)}
            </div>
          </div>
          <Link href="/library" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">Back to library</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {usesSandpack ? (
          <div className="sandpack-wrapper">
            <Sandpack
              template="react"
              files={item.files}
              customSetup={{ dependencies: item.dependencies }}
              options={{
                showNavigator: true,
                showTabs: true,
                editorHeight: "620px",
                readOnly: false,
              }}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
            <iframe
              title={`${item.title} preview`}
              sandbox="allow-scripts"
              srcDoc={iframeDocument(item.files)}
              className="h-[620px] w-full"
            />
          </div>
        )}
      </section>
    </main>
  );
}

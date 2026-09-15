"use client";

import { Code2, FolderOpen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { LibraryItem } from "@/lib/library";

type LibraryClientProps = {
  items: LibraryItem[];
};

export function LibraryClient({ items }: LibraryClientProps) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [framework, setFramework] = useState("");

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedTag = tag.toLowerCase();
    const normalizedFramework = framework.toLowerCase();

    return items.filter((item) => {
      const searchable = [item.id, item.title, item.notes, ...item.tags]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (!normalizedTag || item.tags.some((value) => value.toLowerCase() === normalizedTag)) &&
        (!normalizedFramework || item.framework === normalizedFramework)
      );
    });
  }, [framework, items, query, tag]);

  const tags = [...new Set(items.flatMap((item) => item.tags))].sort();

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500"
            placeholder="Search titles, tags, notes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          className="rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-200 outline-none"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-200 outline-none"
          value={framework}
          onChange={(event) => setFramework(event.target.value)}
        >
          <option value="">All frameworks</option>
          <option value="react">React</option>
          <option value="nextjs">Next.js</option>
          <option value="vanilla">Vanilla</option>
          <option value="webgl">WebGL</option>
          <option value="html">HTML</option>
        </select>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}
        </p>
        <Link
          href="/library/new"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Add to library
        </Link>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-zinc-600" />
          <h2 className="mt-4 text-lg font-medium text-zinc-200">No library items yet</h2>
          <p className="mt-2 text-sm text-zinc-500">Create the first item and commit it to GitHub.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.type}</p>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-100">{item.title}</h3>
                </div>
                <Code2 className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{item.notes || item.sourceUrl || "No notes provided."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.tags.map((value) => (
                  <span key={value} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
                    {value}
                  </span>
                ))}
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">{item.framework}</span>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-500">
                <span>{Object.keys(item.files).length} files</span>
                <Link className="text-zinc-200 hover:text-white" href={`/library/preview/${encodeURIComponent(item.id)}`}>
                  Preview →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

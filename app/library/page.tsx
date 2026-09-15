import { LibraryClient } from "@/components/library/LibraryClient";
import { listLibraryItems } from "@/lib/library";
import Link from "next/link";

type LibraryPageProps = {
  searchParams: Promise<{
    q?: string;
    tag?: string;
    framework?: string;
    type?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const items = await listLibraryItems(params);

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Private content store</p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-100">Component Library</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/code" className="text-zinc-400 hover:text-white">Open Aura</Link>
            <Link href="/library/new" className="rounded-lg bg-white px-3 py-2 font-medium text-zinc-950 hover:bg-zinc-200">Add item</Link>
          </div>
        </div>
      </header>
      <LibraryClient items={items} />
    </main>
  );
}

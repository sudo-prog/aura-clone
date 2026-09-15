import { LibraryForm } from "@/components/library/LibraryForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewLibraryItemPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Private content store</p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-100">Add to library</h1>
          </div>
          <Link href="/library" className="text-sm text-zinc-400 hover:text-white">Back to library</Link>
        </div>
      </header>
      <LibraryForm />
    </main>
  );
}

import { NextResponse } from "next/server";
import { listLibraryItems } from "@/lib/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const items = await listLibraryItems({
      q: searchParams.get("q") || undefined,
      tag: searchParams.get("tag") || undefined,
      framework: searchParams.get("framework") || undefined,
      type: searchParams.get("type") || undefined,
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load the library." },
      { status: 500 },
    );
  }
}

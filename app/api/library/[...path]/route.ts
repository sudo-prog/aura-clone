import { NextResponse } from "next/server";
import { getRepositoryEntry } from "@/lib/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const requestedPath = path.join("/");

  try {
    const entry = await getRepositoryEntry(requestedPath || "index.json");
    const raw = new URL(request.url).searchParams.get("raw") === "1";

    if (raw && entry.type === "file") {
      return new NextResponse(entry.content, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load repository content." },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 },
    );
  }
}

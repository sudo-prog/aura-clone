import { z } from "zod";
import { NextResponse } from "next/server";
import { commitLibraryFiles } from "@/lib/library";

export const runtime = "nodejs";

const requestSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1),
  message: z.string().min(1).default("Update component library"),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    await commitLibraryFiles(body.files, body.message);

    return NextResponse.json({ ok: true, files: body.files.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to commit files." },
      { status: 500 },
    );
  }
}

import { z } from "zod";
import { NextResponse } from "next/server";
import { upsertLibraryItem, type LibraryItem } from "@/lib/library";

const itemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["template", "component", "project"]),
  framework: z.enum(["react", "nextjs", "vanilla", "webgl", "html"]),
  tags: z.array(z.string()).default([]),
  dependencies: z.record(z.string(), z.string()).default({}),
  sourceUrl: z.string().optional(),
  stars: z.number().optional(),
  notes: z.string().optional(),
  files: z.record(z.string(), z.string()).refine((value) => Object.keys(value).length > 0, "At least one file is required"),
  preview: z.enum(["sandpack", "iframe"]).optional(),
  screenshotUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = z
      .object({
        item: itemSchema,
        message: z.string().optional(),
      })
      .parse(await request.json());

    const item = await upsertLibraryItem(body.item as LibraryItem, body.message);

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save the library item." },
      { status: 500 },
    );
  }
}

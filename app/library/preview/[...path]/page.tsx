import { PreviewClient } from "@/components/library/PreviewClient";
import { getLibraryItem } from "@/lib/library";
import { notFound } from "next/navigation";

type PreviewPageProps = {
  params: Promise<{ path: string[] }>;
};

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { path } = await params;
  const id = decodeURIComponent(path.join("/"));

  const item = await getLibraryItem(id).catch(() => null);

  if (!item) {
    notFound();
  }

  return <PreviewClient item={item} />;
}
